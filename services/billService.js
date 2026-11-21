const Bill = require('../models/billModel');
const BillItem = require('../models/billItemModel');
const Vendor = require('../models/vendorModel');
const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const JournalService = require('./journalService');
const { sequelize } = require('../config/db');

const num = (v) => Number(v) || 0;

// Computes an item's line_total (and its own tax_amount, if not supplied)
// from quantity/unit_cost/discount/tax, so the caller doesn't have to.
function computeItemTotals(item) {
  const quantity = num(item.quantity ?? 1);
  const unitCost = num(item.unit_cost);
  const gross = quantity * unitCost;

  const discountAmount = item.discount_amount !== undefined && item.discount_amount !== ''
    ? num(item.discount_amount)
    : gross * (num(item.discount_percent) / 100);

  const taxableBase = gross - discountAmount;

  const taxAmount = item.tax_amount !== undefined && item.tax_amount !== ''
    ? num(item.tax_amount)
    : taxableBase * (num(item.tax_percent) / 100);

  const lineTotal = item.line_total !== undefined && item.line_total !== ''
    ? num(item.line_total)
    : taxableBase + taxAmount;

  return {
    product_service: item.product_service,
    description: item.description || null,
    hsn_sac_code: item.hsn_sac_code || null,
    quantity,
    unit: item.unit || null,
    unit_cost: unitCost,
    discount_percent: num(item.discount_percent),
    discount_amount: discountAmount,
    tax_percent: num(item.tax_percent),
    tax_amount: taxAmount,
    line_total: lineTotal
  };
}

// Fills in sub_total / taxable_amount / total_tax / amount (Grand Total) /
// balance_due from the line items and header-level charges, unless the
// caller already supplied explicit values (explicit values always win).
function computeHeaderTotals(data, items) {
  const result = { ...data };

  if (items && items.length) {
    const subTotal = items.reduce((sum, i) => sum + (num(i.quantity) * num(i.unit_cost)), 0);
    const itemDiscount = items.reduce((sum, i) => sum + num(i.discount_amount), 0);
    const itemTax = items.reduce((sum, i) => sum + num(i.tax_amount), 0);

    if (result.sub_total === undefined || result.sub_total === '') result.sub_total = subTotal;
    if (result.total_tax === undefined || result.total_tax === '') result.total_tax = itemTax;
    if (result.taxable_amount === undefined || result.taxable_amount === '') result.taxable_amount = subTotal - itemDiscount;
  }

  const subTotal = num(result.sub_total);
  const discount = num(result.discount);
  const totalTax = num(result.total_tax);
  const shipping = num(result.shipping_charges);
  const otherCharges = num(result.other_charges);
  const roundOff = num(result.round_off);

  if (result.amount === undefined || result.amount === '' || result.amount === null) {
    result.amount = subTotal - discount + totalTax + shipping + otherCharges + roundOff;
  }

  if (result.balance_due === undefined || result.balance_due === '') {
    result.balance_due = num(result.amount) - num(result.amount_paid);
  }

  if (result.outstanding_balance === undefined || result.outstanding_balance === '') {
    result.outstanding_balance = result.balance_due;
  }

  return result;
}

const BillService = {
  async getAll({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { rows, count } = await Bill.findAndCountAll({
      include: [{ model: Vendor }, { model: BillItem, as: 'items' }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const flattened = rows.map(r => ({
      ...r.toJSON(),
      vendor_name: r.Vendor?.name
    }));

    return { rows: flattened, total: count };
  },

  async create(data) {
    const transaction = await sequelize.transaction();
    try {
      const { items = [], ...header } = data;
      const preparedItems = items.map(computeItemTotals);
      const billData = computeHeaderTotals({ ...header, vendor_id: header.vendor_id || null }, preparedItems);

      const bill = await Bill.create(billData, { transaction });

      if (preparedItems.length) {
        await BillItem.bulkCreate(
          preparedItems.map(i => ({ ...i, bill_id: bill.id })),
          { transaction }
        );
      }

      // Update Accounts Payable
      const apAccount = await Account.findOne({ where: { name: 'Accounts Payable' }, transaction });
      if (apAccount) {
        await apAccount.increment('balance', { by: billData.amount, transaction });

        await Transaction.create({
          type: 'expense',
          amount: billData.amount,
          date: new Date(),
          account_id: apAccount.id,
          reference_type: 'bill',
          reference_id: bill.id,
          description: billData.vendor_id ? `Bill recorded from Vendor #${billData.vendor_id}` : 'Bill recorded (no vendor)'
        }, { transaction });

        const expenseAccount = await Account.findOne({ where: { name: 'Bill Expenses' }, transaction })
          || await Account.create({ name: 'Bill Expenses', type: 'Expense', balance: 0 }, { transaction });
        await expenseAccount.increment('balance', { by: billData.amount, transaction });

        // Post to the General Ledger: Dr Bill Expenses / Cr Accounts Payable
        await JournalService.createJournalEntry({
          date: new Date(),
          referenceId: bill.id,
          description: billData.vendor_id ? `Bill recorded from Vendor #${billData.vendor_id}` : 'Bill recorded (no vendor)',
          lines: [
            { accountId: expenseAccount.id, debit: billData.amount, credit: 0 },
            { accountId: apAccount.id, debit: 0, credit: billData.amount }
          ]
        }, { transaction });
      }

      await transaction.commit();
      return this.getOne(bill.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  // Editing a bill: if the amount changes, this also adjusts the Accounts
  // Payable / Bill Expenses balances and posts a single adjustment journal
  // entry for the difference, so the Ledger and Reports stay accurate
  // instead of drifting from what's on screen.
  async update(id, data) {
    const transaction = await sequelize.transaction();
    try {
      const bill = await Bill.findByPk(id, { transaction });
      if (!bill) {
        const error = new Error('Bill not found');
        error.status = 404;
        throw error;
      }

      const { items, ...header } = data;
      const preparedItems = items ? items.map(computeItemTotals) : undefined;
      if ('vendor_id' in header) header.vendor_id = header.vendor_id || null;
      const billData = computeHeaderTotals(header, preparedItems);

      const oldAmount = parseFloat(bill.amount);
      const newAmount = billData.amount !== undefined ? parseFloat(billData.amount) : oldAmount;
      const diff = newAmount - oldAmount;

      await bill.update(billData, { transaction });

      // Replace line items only when the caller sent an items array.
      if (preparedItems) {
        await BillItem.destroy({ where: { bill_id: id }, transaction });
        if (preparedItems.length) {
          await BillItem.bulkCreate(
            preparedItems.map(i => ({ ...i, bill_id: id })),
            { transaction }
          );
        }
      }

      if (diff !== 0) {
        const apAccount = await Account.findOne({ where: { name: 'Accounts Payable' }, transaction });
        const expenseAccount = await Account.findOne({ where: { name: 'Bill Expenses' }, transaction })
          || await Account.create({ name: 'Bill Expenses', type: 'Expense', balance: 0 }, { transaction });

        if (apAccount) {
          await apAccount.increment('balance', { by: diff, transaction });
          await expenseAccount.increment('balance', { by: diff, transaction });

          await JournalService.createJournalEntry({
            date: new Date(),
            referenceId: bill.id,
            description: `Bill #${bill.id} amount adjusted (₹${oldAmount} -> ₹${newAmount})`,
            lines: diff > 0
              ? [{ accountId: expenseAccount.id, debit: diff, credit: 0 }, { accountId: apAccount.id, debit: 0, credit: diff }]
              : [{ accountId: apAccount.id, debit: -diff, credit: 0 }, { accountId: expenseAccount.id, debit: 0, credit: -diff }]
          }, { transaction });
        }
      }

      await transaction.commit();
      return this.getOne(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async getOne(id) {
    const bill = await Bill.findByPk(id, { include: [{ model: Vendor }, { model: BillItem, as: 'items' }] });
    if (!bill) {
      const error = new Error('Bill not found');
      error.status = 404;
      throw error;
    }
    return bill;
  },

  // Reverses the bill's effect on the books (rather than erasing it),
  // then removes the bill record itself (its items cascade-delete).
  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      const bill = await Bill.findByPk(id, { transaction });
      if (!bill) {
        const error = new Error('Bill not found');
        error.status = 404;
        throw error;
      }

      const amount = parseFloat(bill.amount);
      const apAccount = await Account.findOne({ where: { name: 'Accounts Payable' }, transaction });
      const expenseAccount = await Account.findOne({ where: { name: 'Bill Expenses' }, transaction });

      if (apAccount) await apAccount.decrement('balance', { by: amount, transaction });
      if (expenseAccount) await expenseAccount.decrement('balance', { by: amount, transaction });

      if (apAccount && expenseAccount) {
        await JournalService.createJournalEntry({
          date: new Date(),
          referenceId: bill.id,
          description: `Bill #${bill.id} reversed (deleted)${bill.vendor_id ? ' - Vendor #' + bill.vendor_id : ''}`,
          lines: [
            { accountId: apAccount.id, debit: amount, credit: 0 },
            { accountId: expenseAccount.id, debit: 0, credit: amount }
          ]
        }, { transaction });
      }

      await BillItem.destroy({ where: { bill_id: id }, transaction });
      await bill.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

module.exports = BillService;

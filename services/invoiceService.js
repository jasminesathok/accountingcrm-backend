const Invoice = require('../models/invoiceModel');
const InvoiceItem = require('../models/invoiceItemModel');
const Client = require('../models/clientModel');
const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const JournalService = require('./journalService');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

const num = (v) => Number(v) || 0;

// Computes an item's line_total (and its own tax_amount, if not supplied)
// from quantity/unit_price/discount/tax, so the caller doesn't have to.
function computeItemTotals(item) {
  const quantity = num(item.quantity ?? 1);
  const unitPrice = num(item.unit_price);
  const gross = quantity * unitPrice;

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
    unit_price: unitPrice,
    discount_percent: num(item.discount_percent),
    discount_amount: discountAmount,
    tax_percent: num(item.tax_percent),
    tax_amount: taxAmount,
    line_total: lineTotal
  };
}

// Fills in sub_total / taxable_amount / total_tax / total_amount / balance_due
// from the line items and header-level charges, unless the caller already
// supplied explicit values (explicit values always win).
function computeHeaderTotals(data, items) {
  const result = { ...data };

  if (items && items.length) {
    const subTotal = items.reduce((sum, i) => sum + (num(i.quantity) * num(i.unit_price)), 0);
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

  if (result.total_amount === undefined || result.total_amount === '' || result.total_amount === null) {
    result.total_amount = subTotal - discount + totalTax + shipping + otherCharges + roundOff;
  }

  if (result.balance_due === undefined || result.balance_due === '') {
    result.balance_due = num(result.total_amount) - num(result.amount_paid);
  }

  return result;
}

const InvoiceService = {
  async getAll({ search = '', page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { rows, count } = await Invoice.findAndCountAll({
      include: [{
        model: Client,
        where: {
          [Op.or]: [
            { first_name: { [Op.like]: `%${search}%` } },
            { last_name: { [Op.like]: `%${search}%` } },
            { company_name: { [Op.like]: `%${search}%` } }
          ]
        },
        required: search ? true : false
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Flatten the result to match previous format if needed
    const flattened = rows.map(r => ({
      ...r.toJSON(),
      first_name: r.Client?.first_name,
      last_name: r.Client?.last_name,
      company_name: r.Client?.company_name,
      client_email: r.Client?.email,
      client_phone: r.Client?.phone,
      client_gst_number: r.Client?.gst_number
    }));

    return { rows: flattened, total: count };
  },

  async create(data) {
    const transaction = await sequelize.transaction();
    try {
      const { items = [], ...header } = data;
      const preparedItems = items.map(computeItemTotals);
      const invoiceData = computeHeaderTotals(header, preparedItems);

      const invoice = await Invoice.create(invoiceData, { transaction });

      if (preparedItems.length) {
        await InvoiceItem.bulkCreate(
          preparedItems.map(i => ({ ...i, invoice_id: invoice.id })),
          { transaction }
        );
      }

      // Auto-create transaction (Income Prediction)
      const arAccount = await Account.findOne({ where: { name: 'Accounts Receivable' }, transaction });
      if (arAccount) {
        await arAccount.increment('balance', { by: invoiceData.total_amount, transaction });

        await Transaction.create({
          type: 'income',
          amount: invoiceData.total_amount,
          date: new Date(),
          account_id: arAccount.id,
          reference_type: 'invoice',
          reference_id: invoice.id,
          description: `Invoice created for Client #${invoiceData.client_id}`
        }, { transaction });

        const revenueAccount = await Account.findOne({ where: { name: 'Sales Revenue' }, transaction })
          || await Account.create({ name: 'Sales Revenue', type: 'Income', balance: 0 }, { transaction });
        await revenueAccount.increment('balance', { by: invoiceData.total_amount, transaction });

        // Post to the General Ledger: Dr Accounts Receivable / Cr Sales Revenue
        await JournalService.createJournalEntry({
          date: new Date(),
          referenceId: invoice.id,
          description: `Invoice #${invoice.id} issued to Client #${invoiceData.client_id}`,
          lines: [
            { accountId: arAccount.id, debit: invoiceData.total_amount, credit: 0 },
            { accountId: revenueAccount.id, debit: 0, credit: invoiceData.total_amount }
          ]
        }, { transaction });
      }

      await transaction.commit();
      return this.getOne(invoice.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async getOne(id) {
    const invoice = await Invoice.findByPk(id, { include: [Client, { model: InvoiceItem, as: 'items' }] });
    if (!invoice) {
      const error = new Error('Invoice not found');
      error.status = 404;
      throw error;
    }
    return invoice;
  },

  // Editing an invoice: if the amount changes, this also adjusts the
  // Accounts Receivable / Sales Revenue balances and posts a single
  // adjustment journal entry for the difference, so the Ledger and
  // Reports stay accurate instead of drifting from what's on screen.
  async update(id, data) {
    const transaction = await sequelize.transaction();
    try {
      const invoice = await Invoice.findByPk(id, { transaction });
      if (!invoice) {
        const error = new Error('Invoice not found');
        error.status = 404;
        throw error;
      }

      const { items, ...header } = data;
      const preparedItems = items ? items.map(computeItemTotals) : undefined;
      const invoiceData = computeHeaderTotals(header, preparedItems);

      const oldAmount = parseFloat(invoice.total_amount);
      const newAmount = invoiceData.total_amount !== undefined ? parseFloat(invoiceData.total_amount) : oldAmount;
      const diff = newAmount - oldAmount;

      await invoice.update(invoiceData, { transaction });

      // Replace line items only when the caller sent an items array.
      if (preparedItems) {
        await InvoiceItem.destroy({ where: { invoice_id: id }, transaction });
        if (preparedItems.length) {
          await InvoiceItem.bulkCreate(
            preparedItems.map(i => ({ ...i, invoice_id: id })),
            { transaction }
          );
        }
      }

      if (diff !== 0) {
        const arAccount = await Account.findOne({ where: { name: 'Accounts Receivable' }, transaction });
        const revenueAccount = await Account.findOne({ where: { name: 'Sales Revenue' }, transaction })
          || await Account.create({ name: 'Sales Revenue', type: 'Income', balance: 0 }, { transaction });

        if (arAccount) {
          await arAccount.increment('balance', { by: diff, transaction });
          await revenueAccount.increment('balance', { by: diff, transaction });

          await JournalService.createJournalEntry({
            date: new Date(),
            referenceId: invoice.id,
            description: `Invoice #${invoice.id} amount adjusted (₹${oldAmount} -> ₹${newAmount})`,
            lines: diff > 0
              ? [{ accountId: arAccount.id, debit: diff, credit: 0 }, { accountId: revenueAccount.id, debit: 0, credit: diff }]
              : [{ accountId: revenueAccount.id, debit: -diff, credit: 0 }, { accountId: arAccount.id, debit: 0, credit: -diff }]
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

  // Reverses the invoice's effect on the books (Cr AR / Dr Sales Revenue),
  // then removes the invoice record itself (its items cascade-delete).
  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      const invoice = await Invoice.findByPk(id, { transaction });
      if (!invoice) {
        const error = new Error('Invoice not found');
        error.status = 404;
        throw error;
      }

      const amount = parseFloat(invoice.total_amount);
      const arAccount = await Account.findOne({ where: { name: 'Accounts Receivable' }, transaction });
      const revenueAccount = await Account.findOne({ where: { name: 'Sales Revenue' }, transaction });

      if (arAccount) {
        await arAccount.decrement('balance', { by: amount, transaction });
        if (revenueAccount) {
          await revenueAccount.decrement('balance', { by: amount, transaction });

          await JournalService.createJournalEntry({
            date: new Date(),
            referenceId: invoice.id,
            description: `Invoice #${invoice.id} deleted (reversed)`,
            lines: [
              { accountId: revenueAccount.id, debit: amount, credit: 0 },
              { accountId: arAccount.id, debit: 0, credit: amount }
            ]
          }, { transaction });
        }
      }

      await InvoiceItem.destroy({ where: { invoice_id: id }, transaction });
      await invoice.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async getSummary() {
    return {
      paid: await Invoice.sum('total_amount', { where: { status: 'paid' } }) || 0,
      pending: await Invoice.sum('total_amount', { where: { status: 'pending' } }) || 0,
      overdue: await Invoice.sum('total_amount', { where: { status: 'overdue' } }) || 0,
      total: await Invoice.count()
    };
  }
};

module.exports = InvoiceService;

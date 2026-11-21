const Payment = require('../models/paymentModel');
const Invoice = require('../models/invoiceModel');
const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const JournalService = require('./journalService');
const { sequelize } = require('../config/db');

const PaymentService = {
  async getAll({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { rows, count } = await Payment.findAndCountAll({
      include: [{ model: Invoice, include: ['Client'] }],
      order: [['payment_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const flattened = rows.map(r => ({
      ...r.toJSON(),
      first_name: r.Invoice?.Client?.first_name,
      last_name: r.Invoice?.Client?.last_name
    }));

    return { rows: flattened, total: count };
  },

  async getOne(id) {
    const payment = await Payment.findByPk(id, { include: [{ model: Invoice, include: ['Client'] }] });
    if (!payment) {
      const error = new Error('Payment not found');
      error.status = 404;
      throw error;
    }
    return payment;
  },

  async create(data) {
    const transaction = await sequelize.transaction();
    try {
      if (!data.payment_number) {
        const count = await Payment.count({ transaction });
        data.payment_number = `PMT-${String(count + 1).padStart(5, '0')}`;
      }
      if (!data.payment_confirmation_date && (data.payment_status === undefined || data.payment_status === 'completed')) {
        data.payment_confirmation_date = data.payment_date;
      }
      const payment = await Payment.create(data, { transaction });
      const invoice = await Invoice.findByPk(data.invoice_id, { transaction });

      if (!invoice) throw new Error('Invoice not found');

      // Update Invoice Status
      await invoice.update({ status: 'paid' }, { transaction });

      // Update Accounts (Cash UP, AR DOWN)
      const cashAccount = await Account.findOne({ where: { name: 'Cash' }, transaction });
      const arAccount = await Account.findOne({ where: { name: 'Accounts Receivable' }, transaction })
        || await Account.create({ name: 'Accounts Receivable', type: 'Asset', balance: 0 }, { transaction });
      const bankAccount = await Account.findOne({ where: { name: 'Bank Account' }, transaction })
        || await Account.create({ name: 'Bank Account', type: 'Asset', balance: 0 }, { transaction });

      if (cashAccount) await cashAccount.increment('balance', { by: data.amount, transaction });
      if (arAccount) await arAccount.decrement('balance', { by: data.amount, transaction });

      // Record Transaction
      await Transaction.create({
        type: 'income',
        amount: data.amount,
        date: data.payment_date,
        account_id: cashAccount?.id,
        reference_type: 'payment',
        reference_id: payment.id,
        description: `Payment received for Invoice #${data.invoice_id}`
      }, { transaction });

      await JournalService.createJournalEntry({
        date: data.payment_date,
        referenceId: payment.id,
        description: `Payment received for Invoice #${data.invoice_id}`,
        lines: [
          { accountId: bankAccount.id, debit: data.amount, credit: 0 },
          { accountId: arAccount?.id, debit: 0, credit: data.amount }
        ]
      }, { transaction });

      await transaction.commit();
      return payment;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  // Editing a recorded payment: adjusts Cash/AR balances and posts a single
  // adjustment journal entry for the difference, instead of silently
  // rewriting history - so the Ledger stays traceable.
  async update(id, data) {
    const transaction = await sequelize.transaction();
    try {
      const payment = await Payment.findByPk(id, { transaction });
      if (!payment) {
        const error = new Error('Payment not found');
        error.status = 404;
        throw error;
      }

      const oldAmount = parseFloat(payment.amount);
      const newAmount = data.amount !== undefined ? parseFloat(data.amount) : oldAmount;
      const newDate = data.payment_date || payment.payment_date;
      const newInvoiceId = data.invoice_id || payment.invoice_id;
      const diff = newAmount - oldAmount;

      const cashAccount = await Account.findOne({ where: { name: 'Cash' }, transaction });
      const arAccount = await Account.findOne({ where: { name: 'Accounts Receivable' }, transaction });
      const bankAccount = await Account.findOne({ where: { name: 'Bank Account' }, transaction });

      if (diff !== 0) {
        if (cashAccount) await cashAccount.increment('balance', { by: diff, transaction });
        if (arAccount) await arAccount.decrement('balance', { by: diff, transaction });

        if (bankAccount && arAccount) {
          await JournalService.createJournalEntry({
            date: newDate,
            referenceId: payment.id,
            description: `Payment #${payment.id} adjusted for Invoice #${newInvoiceId} (₹${oldAmount} -> ₹${newAmount})`,
            lines: diff > 0
              ? [{ accountId: bankAccount.id, debit: diff, credit: 0 }, { accountId: arAccount.id, debit: 0, credit: diff }]
              : [{ accountId: arAccount.id, debit: -diff, credit: 0 }, { accountId: bankAccount.id, debit: 0, credit: -diff }]
          }, { transaction });
        }
      }

      await payment.update({ amount: newAmount, payment_date: newDate, invoice_id: newInvoiceId }, { transaction });

      await transaction.commit();
      return payment;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  // Reverses the payment's effect on the books (rather than erasing it),
  // then removes the payment record itself.
  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      const payment = await Payment.findByPk(id, { transaction });
      if (!payment) {
        const error = new Error('Payment not found');
        error.status = 404;
        throw error;
      }

      const amount = parseFloat(payment.amount);
      const cashAccount = await Account.findOne({ where: { name: 'Cash' }, transaction });
      const arAccount = await Account.findOne({ where: { name: 'Accounts Receivable' }, transaction });
      const bankAccount = await Account.findOne({ where: { name: 'Bank Account' }, transaction });

      if (cashAccount) await cashAccount.decrement('balance', { by: amount, transaction });
      if (arAccount) await arAccount.increment('balance', { by: amount, transaction });

      if (bankAccount && arAccount) {
        await JournalService.createJournalEntry({
          date: payment.payment_date,
          referenceId: payment.id,
          description: `Payment #${payment.id} reversed (deleted) for Invoice #${payment.invoice_id}`,
          lines: [
            { accountId: arAccount.id, debit: amount, credit: 0 },
            { accountId: bankAccount.id, debit: 0, credit: amount }
          ]
        }, { transaction });
      }

      const invoice = await Invoice.findByPk(payment.invoice_id, { transaction });
      if (invoice && invoice.status === 'paid') {
        await invoice.update({ status: 'pending' }, { transaction });
      }

      await payment.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

module.exports = PaymentService;

const Expense = require('../models/expenseModel');
const Vendor = require('../models/vendorModel');
const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const JournalService = require('./journalService');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

const ExpenseService = {
  async getAll({ search = '', page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { rows, count } = await Expense.findAndCountAll({
      where: {
        [Op.or]: [
          { category: { [Op.like]: `%${search}%` } }
        ]
      },
      include: [{ model: Vendor }],
      order: [['date', 'DESC']],
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
      if (!data.expense_number) {
        const count = await Expense.count({ transaction });
        data.expense_number = `EXP-${String(count + 1).padStart(5, '0')}`;
      }
      if (data.paid_amount !== undefined && data.balance_amount === undefined) {
        data.balance_amount = parseFloat(data.amount || 0) - parseFloat(data.paid_amount || 0);
      }
      const expense = await Expense.create(data, { transaction });

      const cashAccount = await Account.findOne({ where: { name: 'Cash' }, transaction })
        || await Account.create({ name: 'Cash', type: 'Asset', balance: 0 }, { transaction });

      const categoryName = data.category ? `${data.category} Expense` : 'General Expense';
      const expenseAccount = await Account.findOne({ where: { name: categoryName }, transaction })
        || await Account.create({ name: categoryName, type: 'Expense', balance: 0 }, { transaction });

      await expenseAccount.increment('balance', { by: data.amount, transaction });
      await cashAccount.decrement('balance', { by: data.amount, transaction });

      await Transaction.create({
        type: 'expense',
        amount: data.amount,
        date: data.date,
        account_id: cashAccount.id,
        reference_type: 'expense',
        reference_id: expense.id,
        description: data.category ? `Expense - ${data.category}` : 'Expense recorded'
      }, { transaction });

      // Post to the General Ledger: Dr <Category> Expense / Cr Cash
      await JournalService.createJournalEntry({
        date: data.date,
        referenceId: expense.id,
        description: data.category ? `Expense - ${data.category}` : 'Expense recorded',
        lines: [
          { accountId: expenseAccount.id, debit: data.amount, credit: 0 },
          { accountId: cashAccount.id, debit: 0, credit: data.amount }
        ]
      }, { transaction });

      await transaction.commit();
      return expense;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async update(id, data) {
    const expense = await Expense.findByPk(id);
    if (!expense) throw new Error('Expense not found');
    return await expense.update(data);
  },

  async getOne(id) {
    const expense = await Expense.findByPk(id, { include: [{ model: Vendor }] });
    if (!expense) {
      const error = new Error('Expense not found');
      error.status = 404;
      throw error;
    }
    return expense;
  },

  // Reverses the expense's effect on the books (rather than erasing it),
  // then removes the expense record itself.
  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      const expense = await Expense.findByPk(id, { transaction });
      if (!expense) {
        const error = new Error('Expense not found');
        error.status = 404;
        throw error;
      }

      const amount = parseFloat(expense.amount);
      const categoryName = expense.category ? `${expense.category} Expense` : 'General Expense';

      const cashAccount = await Account.findOne({ where: { name: 'Cash' }, transaction });
      const expenseAccount = await Account.findOne({ where: { name: categoryName }, transaction });

      if (expenseAccount) await expenseAccount.decrement('balance', { by: amount, transaction });
      if (cashAccount) await cashAccount.increment('balance', { by: amount, transaction });

      if (expenseAccount && cashAccount) {
        await JournalService.createJournalEntry({
          date: expense.date,
          referenceId: expense.id,
          description: `Expense #${expense.id} reversed (deleted)${expense.category ? ' - ' + expense.category : ''}`,
          lines: [
            { accountId: cashAccount.id, debit: amount, credit: 0 },
            { accountId: expenseAccount.id, debit: 0, credit: amount }
          ]
        }, { transaction });
      }

      await expense.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

module.exports = ExpenseService;

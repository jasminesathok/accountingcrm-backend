const Transaction = require('../models/transactionModel');
const Account = require('../models/accountModel');
const BankAccount = require('../models/bankAccountModel');
const Client = require('../models/clientModel');
const Vendor = require('../models/vendorModel');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

const INCLUDES = [
  { model: Account, attributes: ['name', 'code', 'type'] },
  { model: Account, as: 'DebitAccount', attributes: ['name', 'code'] },
  { model: Account, as: 'CreditAccount', attributes: ['name', 'code'] },
  { model: BankAccount, attributes: ['account_name'] },
  { model: Client, attributes: ['first_name', 'last_name', 'company_name'] },
  { model: Vendor, attributes: ['name', 'company_name'] }
];

const flatten = (r) => {
  const j = r.toJSON();
  return {
    ...j,
    account_name: j.Account?.name,
    debit_account_name: j.DebitAccount?.name,
    credit_account_name: j.CreditAccount?.name,
    bank_account_name: j.BankAccount?.account_name,
    client_name: j.Client ? (j.Client.company_name || `${j.Client.first_name || ''} ${j.Client.last_name || ''}`.trim()) : undefined,
    vendor_name: j.Vendor ? (j.Vendor.company_name || j.Vendor.name) : undefined
  };
};

// Fills Account Category from the linked Chart of Account, and Total
// Amount from Amount + Tax - Discount, whenever the caller didn't supply
// them explicitly — mirrors how BankAccount/Client services default
// derived fields on create/update.
async function applyDerivedFields(data) {
  if (!data.account_category && data.account_id) {
    const acc = await Account.findByPk(data.account_id);
    if (acc) data.account_category = acc.type;
  }
  const amount = parseFloat(data.amount) || 0;
  const tax = parseFloat(data.tax_amount) || 0;
  const discount = parseFloat(data.discount) || 0;
  if (data.total_amount === undefined || data.total_amount === '' || data.total_amount === null) {
    data.total_amount = (amount + tax - discount).toFixed(2);
  }
  if (data.party_type === 'client' && data.client_id && !data.party_name) {
    const c = await Client.findByPk(data.client_id);
    if (c) data.party_name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
  }
  if (data.party_type === 'vendor' && data.vendor_id && !data.party_name) {
    const v = await Vendor.findByPk(data.vendor_id);
    if (v) data.party_name = v.company_name || v.name;
  }
  return data;
}

const TransactionService = {
  async getAll({ search = '', page = 1, limit = 10, type, status, party_type }) {
    const offset = (page - 1) * limit;
    const where = {
      [Op.and]: [
        {
          [Op.or]: [
            { transaction_number: { [Op.like]: `%${search}%` } },
            { type: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
            { voucher_number: { [Op.like]: `%${search}%` } },
            { reference_number: { [Op.like]: `%${search}%` } },
            { party_name: { [Op.like]: `%${search}%` } }
          ]
        }
      ]
    };
    if (type) where[Op.and].push({ type });
    if (status) where[Op.and].push({ status });
    if (party_type) where[Op.and].push({ party_type });

    const { rows, count } = await Transaction.findAndCountAll({
      where,
      include: INCLUDES,
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return { rows: rows.map(flatten), total: count };
  },

  async getOne(id) {
    const record = await Transaction.findByPk(id, { include: INCLUDES });
    if (!record) throw { status: 404, message: 'Transaction not found' };
    return flatten(record);
  },

  async create(data, userId) {
    if (!data.transaction_number) {
      const count = await Transaction.count();
      data.transaction_number = `TXN-${String(count + 1).padStart(6, '0')}`;
    }
    await applyDerivedFields(data);
    data.created_by = data.created_by || (userId ? String(userId) : undefined);

    const transaction = await sequelize.transaction();
    try {
      const record = await Transaction.create(data, { transaction });
      await transaction.commit();
      return await TransactionService.getOne(record.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async update(id, data, userId) {
    const record = await Transaction.findByPk(id);
    if (!record) throw { status: 404, message: 'Transaction not found' };
    await applyDerivedFields(data);
    data.updated_by = data.updated_by || (userId ? String(userId) : undefined);
    if (data.status === 'completed' && record.status !== 'completed' && !data.approved_by) {
      data.approved_by = data.updated_by;
      data.approval_date = data.approval_date || new Date();
    }
    await record.update(data);
    return await TransactionService.getOne(id);
  },

  async delete(id) {
    const record = await Transaction.findByPk(id);
    if (!record) throw { status: 404, message: 'Transaction not found' };
    await record.destroy();
  },

  async getRecent(limit = 10) {
    const rows = await Transaction.findAll({
      include: INCLUDES,
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit)
    });

    return rows.map(flatten);
  },

  async getChartData() {
    const rows = await Transaction.findAll({
      attributes: ['type', 'amount', 'date'],
      order: [['date', 'ASC']]
    });

    const grouped = new Map();
    for (const row of rows) {
      const key = row.date;
      if (!grouped.has(key)) grouped.set(key, { date: key, income: 0, expense: 0 });
      const bucket = grouped.get(key);
      const amount = parseFloat(row.amount) || 0;
      if (row.type === 'income') bucket.income += amount;
      else if (row.type === 'expense') bucket.expense += amount;
    }

    return Array.from(grouped.values());
  }
};

module.exports = TransactionService;

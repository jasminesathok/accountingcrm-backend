const Account = require('../models/accountModel');
const { Op } = require('sequelize');

const DEBIT_NORMAL_TYPES = ['Asset', 'Expense'];

// Account Details > Normal Balance defaults from Account Type when the
// caller doesn't pass one explicitly (Asset/Expense -> Debit, else Credit).
const deriveNormalBalance = (type, normalBalance) => {
  if (normalBalance) return normalBalance;
  return DEBIT_NORMAL_TYPES.includes(type) ? 'Debit' : 'Credit';
};

// Basic information > Account Level: Sub Account when a Parent Account is
// linked, Main Account otherwise, unless the caller overrides it.
const deriveAccountLevel = (parentAccountId, accountLevel) => {
  if (accountLevel) return accountLevel;
  return parentAccountId ? 'Sub Account' : 'Main Account';
};

// Financial Information > Available Balance: how much credit room remains.
// Only meaningful when a Credit Limit is set; otherwise left null so it
// doesn't masquerade as a real figure for accounts with no limit.
const deriveAvailableBalance = (creditLimit, balance) => {
  if (creditLimit === undefined || creditLimit === null || creditLimit === '') return null;
  return parseFloat(creditLimit) - parseFloat(balance || 0);
};

const ALLOWED_FIELDS = [
  'code', 'name', 'type', 'account_category', 'parent_account_id', 'account_level',
  'currency', 'opening_balance', 'balance', 'status',
  'budget_amount', 'actual_amount', 'credit_limit',
  'account_description', 'normal_balance', 'reconciliation_required', 'allow_manual_entry',
  'tax_applicable', 'tax_code',
  'bank_name', 'bank_branch_name', 'account_holder_name', 'bank_account_number',
  'ifsc_code', 'swift_code', 'upi_id',
  'remarks', 'branch', 'department'
];

const pickFields = (data) => {
  const out = {};
  for (const f of ALLOWED_FIELDS) {
    if (data[f] !== undefined) out[f] = data[f] === '' ? null : data[f];
  }
  return out;
};

// Account Code is spec'd as unique. Enforced here at the application level
// (rather than relying solely on the DB index) so a clear 422 comes back
// instead of a raw SequelizeUniqueConstraintError, and so it still works
// on databases where the migration skipped adding the index because of
// pre-existing duplicate codes.
const assertUniqueCode = async (code, excludeId) => {
  if (!code) return;
  const where = { code };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await Account.findOne({ where });
  if (existing) {
    const error = new Error(`Account code "${code}" is already in use`);
    error.status = 422;
    throw error;
  }
};

const AccountService = {
  async getAll({ type, status, account_category, parent_account_id, search } = {}) {
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (account_category) where.account_category = account_category;
    if (parent_account_id !== undefined) where.parent_account_id = parent_account_id || null;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }
    return await Account.findAll({
      where,
      include: [{ model: Account, as: 'ParentAccount', attributes: ['id', 'code', 'name'] }],
      order: [['type', 'ASC'], ['name', 'ASC']]
    });
  },

  async getOne(id) {
    const account = await Account.findByPk(id, {
      include: [
        { model: Account, as: 'ParentAccount', attributes: ['id', 'code', 'name'] },
        { model: Account, as: 'SubAccounts', attributes: ['id', 'code', 'name', 'balance'] }
      ]
    });
    if (!account) {
      const error = new Error('Account not found');
      error.status = 404;
      throw error;
    }
    return account;
  },

  async create(data, actingUser) {
    if (!data.name) {
      const error = new Error('Account name is required');
      error.status = 400;
      throw error;
    }
    if (!data.type) {
      const error = new Error('Account type is required');
      error.status = 400;
      throw error;
    }

    await assertUniqueCode(data.code);

    const fields = pickFields(data);
    const openingBalance = data.opening_balance !== undefined ? parseFloat(data.opening_balance) || 0 : 0;

    return await Account.create({
      ...fields,
      opening_balance: openingBalance,
      // Current Balance starts at the Opening Balance unless a different
      // current balance was explicitly supplied.
      balance: data.balance !== undefined && data.balance !== '' ? data.balance : openingBalance,
      currency: fields.currency || 'INR',
      status: fields.status || 'Active',
      account_level: deriveAccountLevel(fields.parent_account_id, fields.account_level),
      normal_balance: deriveNormalBalance(data.type, fields.normal_balance),
      available_balance: deriveAvailableBalance(fields.credit_limit, data.balance ?? openingBalance),
      created_by: actingUser?.name || null,
      updated_by: actingUser?.name || null
    });
  },

  async update(id, data, actingUser) {
    const account = await Account.findByPk(id);
    if (!account) {
      const error = new Error('Account not found');
      error.status = 404;
      throw error;
    }

    if (data.code && data.code !== account.code) {
      await assertUniqueCode(data.code, id);
    }

    const fields = pickFields(data);
    const nextCreditLimit = fields.credit_limit !== undefined ? fields.credit_limit : account.credit_limit;
    const nextBalance = fields.balance !== undefined ? fields.balance : account.balance;

    return await account.update({
      ...fields,
      account_level: deriveAccountLevel(
        fields.parent_account_id !== undefined ? fields.parent_account_id : account.parent_account_id,
        fields.account_level
      ),
      available_balance: deriveAvailableBalance(nextCreditLimit, nextBalance),
      updated_by: actingUser?.name || account.updated_by
    });
  },

  async delete(id) {
    const account = await Account.findByPk(id);
    if (!account) {
      const error = new Error('Account not found');
      error.status = 404;
      throw error;
    }
    const subAccountCount = await Account.count({ where: { parent_account_id: id } });
    if (subAccountCount > 0) {
      const error = new Error('Cannot delete an account that has sub-accounts. Reassign or delete them first.');
      error.status = 409;
      throw error;
    }
    await account.destroy();
  },

  // Called by JournalService/other posting modules whenever a line hits
  // this account, so System Fields > Last Transaction Date stays current.
  async touchLastTransactionDate(accountId, transaction) {
    if (!accountId) return;
    await Account.update(
      { last_transaction_date: new Date() },
      { where: { id: accountId }, transaction }
    );
  }
};

module.exports = AccountService;

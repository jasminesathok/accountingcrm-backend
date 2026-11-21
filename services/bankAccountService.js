const BankAccount = require('../models/bankAccountModel');

const BankAccountService = {
  async getAll(userId) {
    return await BankAccount.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
  },

  async create(data, userId) {
    if (!data.account_code) {
      const count = await BankAccount.count();
      data.account_code = `BANK-${String(count + 1).padStart(5, '0')}`;
    }
    if (data.opening_balance === undefined || data.opening_balance === '') {
      data.opening_balance = data.balance || 0;
    }
    if (data.available_balance === undefined || data.available_balance === '') {
      data.available_balance = data.balance || 0;
    }
    return await BankAccount.create({ ...data, user_id: userId });
  },

  async update(id, data, userId) {
    const account = await BankAccount.findOne({ where: { id, user_id: userId } });
    if (!account) throw new Error('Bank account not found');
    return await account.update(data);
  },

  async delete(id, userId) {
    const account = await BankAccount.findOne({ where: { id, user_id: userId } });
    if (!account) throw new Error('Bank account not found');
    await account.destroy();
  }
};

module.exports = BankAccountService;

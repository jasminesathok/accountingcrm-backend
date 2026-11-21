const PettyCash = require('../models/pettyCashModel');

const PettyCashService = {
  async getAll(userId) {
    return await PettyCash.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
  },

  async create(data, userId) {
    if (!data.petty_cash_code) {
      const count = await PettyCash.count();
      data.petty_cash_code = `PC-${String(count + 1).padStart(5, '0')}`;
    }
    if (data.balance_amount === undefined || data.balance_amount === '') {
      const received = parseFloat(data.amount_received || 0);
      const paid = parseFloat(data.amount_paid || 0);
      data.balance_amount = received - paid;
    }
    data.last_modified = new Date();
    return await PettyCash.create({ ...data, user_id: userId });
  },

  async update(id, data, userId) {
    const entry = await PettyCash.findOne({ where: { id, user_id: userId } });
    if (!entry) throw new Error('Petty cash entry not found');
    if (data.balance_amount === undefined || data.balance_amount === '') {
      const received = parseFloat(data.amount_received ?? entry.amount_received ?? 0);
      const paid = parseFloat(data.amount_paid ?? entry.amount_paid ?? 0);
      data.balance_amount = received - paid;
    }
    data.last_modified = new Date();
    return await entry.update(data);
  },

  async delete(id, userId) {
    const entry = await PettyCash.findOne({ where: { id, user_id: userId } });
    if (!entry) throw new Error('Petty cash entry not found');
    await entry.destroy();
  }
};

module.exports = PettyCashService;

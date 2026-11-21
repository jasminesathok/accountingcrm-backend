const Client = require('../models/clientModel');
const User = require('../models/userModel');
const { sequelize } = require('../config/db');
const MailService = require('../utils/mailService');
const { validatePasswordStrength } = require('../utils/passwordValidator');
const crypto = require('crypto');
const { Op } = require('sequelize');

// Generates a random password so the admin never has to type/see one
// when adding a client. The client's own login (if they ever need one)
// arrives via the welcome email, same as before.
const generateTempPassword = () => crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '');

const ClientService = {
  async getAll({ search = '', page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { rows, count } = await Client.findAndCountAll({
      where: {
        [Op.or]: [
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
          { company_name: { [Op.like]: `%${search}%` } }
        ]
      },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    return { rows, total: count };
  },

  async getOne(id) {
    const client = await Client.findByPk(id);
    if (!client) throw { status: 404, message: 'Client not found' };
    return client;
  },

  async create(data) {
    // Validate required fields (password is no longer required from the admin -
    // a login password is generated automatically if one isn't supplied)
    if (!data.first_name || !data.last_name || !data.email) {
      throw { status: 400, message: 'Missing required fields: first_name, last_name, email' };
    }

    // Only validate strength if an explicit password was actually supplied;
    // otherwise generate one automatically so there's no prompt for it.
    if (data.password) {
      const passwordValidation = validatePasswordStrength(data.password);
      if (!passwordValidation.valid) {
        throw { status: 400, message: `Password validation failed: ${passwordValidation.errors.join(', ')}` };
      }
    }
    const password = data.password || generateTempPassword();

    const transaction = await sequelize.transaction();
    try {
      // 1. Create Login User for the Client
      const user = await User.create({
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
        password,
        role: 'user' // Default role for clients
      }, { transaction });

      // 2. Create Client linked to the User
      // Spread every client field from the request (basic info, contact,
      // address, tax, financial, bank, sales info, documents, communication
      // preferences, notes) except credentials/user linkage, which are set
      // explicitly below.
      const { password: _password, ...clientFields } = data;
      const client = await Client.create({
        ...clientFields,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        status: data.status || 'active',
        user_id: user.id
      }, { transaction });

      await transaction.commit();

      // Send Welcome Email (Non-blocking - fire and forget)
      MailService.sendWelcomeEmail(
        data.email, 
        `${data.first_name} ${data.last_name}`, 
        password,
        'Client'
      ).catch(err => console.error('Email failed:', err));

      // Return client data without password
      const clientData = client.toJSON();
      return { ...clientData, message: 'Client created successfully. Welcome email sent.' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async update(id, data) {
    const client = await Client.findByPk(id);
    if (!client) throw new Error('Client not found');
    return await client.update(data);
  },

  async delete(id) {
    const client = await Client.findByPk(id);
    if (!client) throw new Error('Client not found');
    await client.destroy();
  }
};

module.exports = ClientService;

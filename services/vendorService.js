const Vendor = require('../models/vendorModel');
const User = require('../models/userModel');
const { sequelize } = require('../config/db');
const MailService = require('../utils/mailService');
const { validatePasswordStrength } = require('../utils/passwordValidator');
const { Op } = require('sequelize');

const VendorService = {
  async getAll({ search = '', page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { rows, count } = await Vendor.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
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
    const vendor = await Vendor.findByPk(id);
    if (!vendor) throw { status: 404, message: 'Vendor not found' };
    return vendor;
  },

  async create(data) {
    // Validate required fields
    if (!data.name || !data.email || !data.password) {
      throw { status: 400, message: 'Missing required fields: name, email, password' };
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw { status: 400, message: `Password validation failed: ${passwordValidation.errors.join(', ')}` };
    }
    const transaction = await sequelize.transaction();
    try {
      // 1. Create Login User for the Vendor
      const user = await User.create({
        name: data.name,
        email: data.email,
        password: data.password, // Use provided password
        role: 'vendor'
      }, { transaction });

      // 2. Create Vendor linked to the User
      // Spread every vendor field from the request (basic info, contact,
      // address, tax, financial, bank, purchase info, documents,
      // communication preferences, notes) except credentials/user linkage,
      // which are set explicitly below.
      const { password, ...vendorFields } = data;
      const vendor = await Vendor.create({
        ...vendorFields,
        name: data.name,
        email: data.email,
        status: data.status || 'active',
        user_id: user.id
      }, { transaction });

      await transaction.commit();

      // Send Welcome Email (Non-blocking - fire and forget)
      MailService.sendWelcomeEmail(
        data.email, 
        data.name, 
        data.password,
        'Vendor'
      ).catch(err => console.error('Email failed:', err));

      // Return vendor data without password
      const vendorData = vendor.toJSON();
      return { ...vendorData, message: 'Vendor created successfully. Welcome email sent.' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async update(id, data) {
    const vendor = await Vendor.findByPk(id);
    if (!vendor) throw new Error('Vendor not found');
    return await vendor.update(data);
  },

  async delete(id) {
    const vendor = await Vendor.findByPk(id);
    if (!vendor) throw new Error('Vendor not found');
    await vendor.destroy();
  }
};

module.exports = VendorService;

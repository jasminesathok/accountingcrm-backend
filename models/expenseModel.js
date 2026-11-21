const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Vendor = require('./vendorModel');

const Expense = sequelize.define('Expense', {
  vendor_id: {
    type: DataTypes.INTEGER,
    references: { model: Vendor, key: 'id' }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  category: DataTypes.STRING,
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  // Basic information
  expense_number: { type: DataTypes.STRING, allowNull: true, unique: true },
  expense_type: { type: DataTypes.ENUM('business', 'personal', 'operational'), allowNull: true, defaultValue: 'business' },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'paid'), allowNull: true, defaultValue: 'pending' },
  reference_number: { type: DataTypes.STRING, allowNull: true },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },

  // Vendor / Payee information
  payee_name: { type: DataTypes.STRING, allowNull: true },
  contact_person: { type: DataTypes.STRING, allowNull: true },
  mobile_number: { type: DataTypes.STRING, allowNull: true },
  email_address: { type: DataTypes.STRING, allowNull: true },

  // Expense details
  expense_name: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  quantity: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 1 },
  unit_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  tax_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Tax details
  gst_number: { type: DataTypes.STRING, allowNull: true },
  gst_type: { type: DataTypes.ENUM('cgst', 'sgst', 'igst'), allowNull: true },
  taxable_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  total_tax: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Payment details
  payment_method: { type: DataTypes.ENUM('cash', 'bank', 'upi', 'card', 'cheque'), allowNull: true },
  payment_mode: { type: DataTypes.ENUM('online', 'offline'), allowNull: true, defaultValue: 'offline' },
  payment_status: { type: DataTypes.ENUM('paid', 'unpaid', 'partial'), allowNull: true, defaultValue: 'unpaid' },
  paid_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  balance_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  transaction_id: { type: DataTypes.STRING, allowNull: true },
  bank_name: { type: DataTypes.STRING, allowNull: true },
  account_name: { type: DataTypes.STRING, allowNull: true },
  cheque_number: { type: DataTypes.STRING, allowNull: true },

  // Attachments & notes
  receipt_upload: { type: DataTypes.STRING, allowNull: true },
  bill_attachment: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // Approval details
  submitted_by: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.STRING, allowNull: true },
  approval_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: true, defaultValue: 'pending' },
  approval_date: { type: DataTypes.DATE, allowNull: true },

  // System fields (createdAt/updatedAt handled automatically by Sequelize timestamps)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'EXPENSE'
});

Expense.belongsTo(Vendor, { foreignKey: 'vendor_id' });

module.exports = Expense;

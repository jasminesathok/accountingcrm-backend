const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Invoice = require('./invoiceModel');
const Bill = require('./billModel');

const Payment = sequelize.define('Payment', {
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Invoice, key: 'id' }
  },
  bill_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Bill, key: 'id' }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  // Basic information
  payment_number: { type: DataTypes.STRING, allowNull: true, unique: true },
  payment_type: { type: DataTypes.ENUM('customer_payment', 'vendor_payment'), allowNull: true, defaultValue: 'customer_payment' },
  payment_status: { type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'), allowNull: true, defaultValue: 'completed' },
  reference_number: { type: DataTypes.STRING, allowNull: true },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },

  // Customer / Vendor information (snapshot at time of payment)
  contact_person: { type: DataTypes.STRING, allowNull: true },
  mobile_number: { type: DataTypes.STRING, allowNull: true },
  email_address: { type: DataTypes.STRING, allowNull: true },

  // Invoice / Bill details
  total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  balance_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Payment details
  payment_method: { type: DataTypes.ENUM('cash', 'bank', 'upi', 'card', 'cheque'), allowNull: true },
  payment_mode: { type: DataTypes.ENUM('online', 'offline'), allowNull: true, defaultValue: 'offline' },
  transaction_id: { type: DataTypes.STRING, allowNull: true },
  cheque_number: { type: DataTypes.STRING, allowNull: true },
  bank_name: { type: DataTypes.STRING, allowNull: true },
  account_name: { type: DataTypes.STRING, allowNull: true },
  account_number: { type: DataTypes.STRING, allowNull: true },
  upi_id: { type: DataTypes.STRING, allowNull: true },
  payment_gateway: { type: DataTypes.STRING, allowNull: true },

  // Tax details
  tax_deducted: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  tax_type: { type: DataTypes.ENUM('gst', 'tds', 'other'), allowNull: true },

  // Additional details
  notes: { type: DataTypes.TEXT, allowNull: true },
  attachment: { type: DataTypes.STRING, allowNull: true },
  received_by: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.STRING, allowNull: true },

  // System fields (createdAt/updatedAt handled automatically by Sequelize timestamps)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  payment_confirmation_date: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'PAYMENT'
});

Payment.belongsTo(Invoice, { foreignKey: 'invoice_id' });
Invoice.hasMany(Payment, { foreignKey: 'invoice_id' });
Payment.belongsTo(Bill, { foreignKey: 'bill_id' });
Bill.hasMany(Payment, { foreignKey: 'bill_id' });

module.exports = Payment;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BankAccount = sequelize.define('BankAccount', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  account_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  account_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  bank_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },

  // Basic information
  account_code: { type: DataTypes.STRING, allowNull: true, unique: true },
  account_type: { type: DataTypes.ENUM('savings', 'current', 'cash_credit', 'od'), allowNull: true, defaultValue: 'savings' },
  branch_name: { type: DataTypes.STRING, allowNull: true },
  ifsc_code: { type: DataTypes.STRING, allowNull: true },
  swift_code: { type: DataTypes.STRING, allowNull: true },
  micr_code: { type: DataTypes.STRING, allowNull: true },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },
  opening_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: true, defaultValue: 'active' },

  // Bank details
  bank_address: { type: DataTypes.STRING, allowNull: true },
  city: { type: DataTypes.STRING, allowNull: true },
  state: { type: DataTypes.STRING, allowNull: true },
  country: { type: DataTypes.STRING, allowNull: true },
  pin_code: { type: DataTypes.STRING, allowNull: true },
  upi_id: { type: DataTypes.STRING, allowNull: true },

  // Transaction details (most recent linked transaction snapshot)
  transaction_id: { type: DataTypes.STRING, allowNull: true },
  transaction_date: { type: DataTypes.DATEONLY, allowNull: true },
  transaction_type: { type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer'), allowNull: true },
  reference_number: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  debit_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  credit_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  available_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Reconciliation details
  reconciliation_status: { type: DataTypes.ENUM('pending', 'reconciled'), allowNull: true, defaultValue: 'pending' },
  statement_date: { type: DataTypes.DATEONLY, allowNull: true },
  reconciled_by: { type: DataTypes.STRING, allowNull: true },
  reconciliation_date: { type: DataTypes.DATEONLY, allowNull: true },

  // Attachments
  bank_statement: { type: DataTypes.STRING, allowNull: true },
  cancelled_cheque: { type: DataTypes.STRING, allowNull: true },
  other_documents: { type: DataTypes.STRING, allowNull: true },

  // Notes
  remarks: { type: DataTypes.TEXT, allowNull: true },
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // System fields (createdAt/updatedAt handled automatically by Sequelize timestamps)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  last_transaction_date: { type: DataTypes.DATEONLY, allowNull: true }
}, {
  tableName: 'BANK_ACCOUNT'
});

module.exports = BankAccount;

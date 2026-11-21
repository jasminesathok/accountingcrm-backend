const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Account = require('./accountModel');
const BankAccount = require('./bankAccountModel');
const Client = require('./clientModel');
const Vendor = require('./vendorModel');

// Field set mirrors the "Accounting CRM - Transaction Module" PDF spec.
const Transaction = sequelize.define('Transaction', {
  // Basic information
  transaction_number: { type: DataTypes.STRING, allowNull: true, unique: true },
  type: {
    type: DataTypes.ENUM('income', 'expense', 'transfer', 'journal'),
    allowNull: false
  }, // Transaction Type
  date: { type: DataTypes.DATEONLY, allowNull: false }, // Transaction Date
  voucher_number: { type: DataTypes.STRING, allowNull: true },
  reference_number: { type: DataTypes.STRING, allowNull: true }, // Invoice/Bill/Payment reference
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    allowNull: true,
    defaultValue: 'completed'
  },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },

  // Account information
  account_id: {
    // Chart of Account
    type: DataTypes.INTEGER,
    references: { model: Account, key: 'id' }
  },
  debit_account_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Account, key: 'id' }
  },
  credit_account_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Account, key: 'id' }
  },
  account_category: {
    type: DataTypes.ENUM('Asset', 'Liability', 'Equity', 'Income', 'Expense'),
    allowNull: true
  },
  bank_account_id: {
    type: DataTypes.INTEGER,
    references: { model: BankAccount, key: 'id' }
  },

  // Party information
  party_type: { type: DataTypes.ENUM('client', 'vendor', 'other'), allowNull: true },
  client_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Client, key: 'id' } },
  vendor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Vendor, key: 'id' } },
  party_name: { type: DataTypes.STRING, allowNull: true }, // Client/Vendor Name (free text fallback)
  contact_person: { type: DataTypes.STRING, allowNull: true },
  mobile_number: { type: DataTypes.STRING, allowNull: true },
  email_address: { type: DataTypes.STRING, allowNull: true },

  // Transaction details
  description: DataTypes.STRING,
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Payment details
  payment_method: { type: DataTypes.ENUM('cash', 'bank', 'upi', 'card', 'cheque'), allowNull: true },
  payment_mode: { type: DataTypes.ENUM('online', 'offline'), allowNull: true },
  gateway_transaction_id: { type: DataTypes.STRING, allowNull: true },
  bank_name: { type: DataTypes.STRING, allowNull: true },
  payment_account_number: { type: DataTypes.STRING, allowNull: true },
  cheque_number: { type: DataTypes.STRING, allowNull: true },
  upi_id: { type: DataTypes.STRING, allowNull: true },

  // Attachments (file paths / URLs)
  receipt_upload: { type: DataTypes.STRING, allowNull: true },
  invoice_bill_attachment: { type: DataTypes.STRING, allowNull: true },
  supporting_documents: { type: DataTypes.STRING, allowNull: true },

  // Notes
  remarks: { type: DataTypes.TEXT, allowNull: true },
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // Legacy link fields (kept for existing invoice/bill/payment auto-postings)
  reference_type: DataTypes.STRING,
  reference_id: DataTypes.INTEGER,

  // System fields (created_at/updated_at handled automatically by Sequelize
  // timestamps == Created Date / Last Modified)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.STRING, allowNull: true },
  approval_date: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'TRANSACTION'
});

Transaction.belongsTo(Account, { foreignKey: 'account_id' });
Transaction.belongsTo(Account, { foreignKey: 'debit_account_id', as: 'DebitAccount' });
Transaction.belongsTo(Account, { foreignKey: 'credit_account_id', as: 'CreditAccount' });
Transaction.belongsTo(BankAccount, { foreignKey: 'bank_account_id' });
Transaction.belongsTo(Client, { foreignKey: 'client_id' });
Transaction.belongsTo(Vendor, { foreignKey: 'vendor_id' });

module.exports = Transaction;

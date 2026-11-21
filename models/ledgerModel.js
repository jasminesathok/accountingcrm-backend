const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Account = require('./accountModel');
const BankAccount = require('./bankAccountModel');
const Client = require('./clientModel');
const Vendor = require('./vendorModel');

// Field set mirrors the "Accounting CRM - Ledger Module" PDF spec.
const Ledger = sequelize.define('Ledger', {
  // Basic information
  ledger_code: { type: DataTypes.STRING, allowNull: true, unique: true },
  ledger_name: { type: DataTypes.STRING, allowNull: false },
  ledger_type: {
    type: DataTypes.ENUM('customer', 'vendor', 'bank', 'cash', 'expense', 'income'),
    allowNull: true
  },
  ledger_group: {
    type: DataTypes.ENUM('assets', 'liabilities', 'income', 'expenses', 'equity'),
    allowNull: true
  },
  parent_ledger_id: { type: DataTypes.INTEGER, allowNull: true },
  opening_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  current_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  balance_type: { type: DataTypes.ENUM('debit', 'credit'), allowNull: true, defaultValue: 'debit' },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: true, defaultValue: 'active' },

  // Account information
  account_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Account, key: 'id' } }, // Chart of Account
  account_code: { type: DataTypes.STRING, allowNull: true }, // GL account code
  account_category: {
    type: DataTypes.ENUM('Asset', 'Liability', 'Income', 'Expense', 'Equity'),
    allowNull: true
  },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },

  // Party information
  party_type: { type: DataTypes.ENUM('client', 'vendor', 'other'), allowNull: true },
  client_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Client, key: 'id' } },
  vendor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Vendor, key: 'id' } },
  party_name: { type: DataTypes.STRING, allowNull: true },
  contact_person: { type: DataTypes.STRING, allowNull: true },
  mobile_number: { type: DataTypes.STRING, allowNull: true },
  email_address: { type: DataTypes.STRING, allowNull: true },

  // Bank details (optional)
  bank_account_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: BankAccount, key: 'id' } },
  bank_name: { type: DataTypes.STRING, allowNull: true },
  bank_account_number: { type: DataTypes.STRING, allowNull: true },
  ifsc_code: { type: DataTypes.STRING, allowNull: true },
  branch_name: { type: DataTypes.STRING, allowNull: true },

  // Notes
  remarks: { type: DataTypes.TEXT, allowNull: true },
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // System fields (created_at/updated_at handled automatically by
  // Sequelize timestamps == Created Date / Updated Date / Last Modified)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  last_transaction_date: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'LEDGER'
});

Ledger.belongsTo(Account, { foreignKey: 'account_id' });
Ledger.belongsTo(BankAccount, { foreignKey: 'bank_account_id' });
Ledger.belongsTo(Client, { foreignKey: 'client_id' });
Ledger.belongsTo(Vendor, { foreignKey: 'vendor_id' });
Ledger.belongsTo(Ledger, { foreignKey: 'parent_ledger_id', as: 'ParentLedger' });

module.exports = Ledger;

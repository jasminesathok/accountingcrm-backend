const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Chart of Accounts Module PDF (Accounting CRM spec) fields, grouped as the
// spec lays them out: Basic Information, Financial Information, Account
// Details, Bank Account Details (optional) and System Fields.
const Account = sequelize.define('Account', {
  // ---- Basic information ----
  // Account ID -> Sequelize `id` (auto-generated primary key)
  code: {
    type: DataTypes.STRING,
    allowNull: true
  }, // Account Code (kept nullable at the DB level for legacy rows; enforced unique when present — see migration + accountService validation)
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }, // Account Name
  type: {
    type: DataTypes.ENUM('Asset', 'Liability', 'Equity', 'Income', 'Expense'),
    allowNull: false
  }, // Account Type
  account_category: { type: DataTypes.STRING, allowNull: true }, // Current Asset, Fixed Asset, Current Liability, ...
  parent_account_id: { type: DataTypes.INTEGER, allowNull: true }, // Parent Account (if sub-account)
  account_level: {
    type: DataTypes.ENUM('Main Account', 'Sub Account'),
    allowNull: true,
    defaultValue: 'Main Account'
  },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },
  opening_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  balance: {
    // Current Balance. Left as `balance` (not renamed) because every other
    // module (Journal, Ledger, Transactions, Bills, Invoices, Payments,
    // Expenses...) reads/increments this exact field for running balances.
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    allowNull: true,
    defaultValue: 'Active'
  },

  // ---- Financial information ----
  budget_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  actual_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  available_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true }, // derived: credit_limit - balance (see accountService)
  credit_limit: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // ---- Account details ----
  account_description: { type: DataTypes.TEXT, allowNull: true },
  normal_balance: { type: DataTypes.ENUM('Debit', 'Credit'), allowNull: true }, // defaults from Account Type when not supplied
  reconciliation_required: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
  allow_manual_entry: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
  tax_applicable: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
  tax_code: { type: DataTypes.ENUM('GST', 'TDS', 'Other'), allowNull: true },

  // ---- Bank account details (optional) ----
  bank_name: { type: DataTypes.STRING, allowNull: true },
  bank_branch_name: { type: DataTypes.STRING, allowNull: true },
  account_holder_name: { type: DataTypes.STRING, allowNull: true },
  bank_account_number: { type: DataTypes.STRING, allowNull: true },
  ifsc_code: { type: DataTypes.STRING, allowNull: true },
  swift_code: { type: DataTypes.STRING, allowNull: true },
  upi_id: { type: DataTypes.STRING, allowNull: true },

  // ---- System fields ----
  // created_at / updated_at (Created Date / Updated Date) are added
  // automatically by Sequelize timestamps in config/db.js.
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  last_transaction_date: { type: DataTypes.DATE, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },

  // Trial Balance Module PDF — Report Filters (Branch, Department)
  branch: {
    type: DataTypes.STRING,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'ACCOUNT'
});

// Parent Account (self-referencing, for sub-accounts)
Account.belongsTo(Account, { as: 'ParentAccount', foreignKey: 'parent_account_id' });
Account.hasMany(Account, { as: 'SubAccounts', foreignKey: 'parent_account_id' });

module.exports = Account;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Chart of Accounts Module PDF (Accounting CRM spec) — brings ACCOUNT up to
// the full field list: Basic Information, Financial Information, Account
// Details, Bank Account Details (optional) and System Fields.
// code/name/type/balance/branch/department already exist from earlier
// migrations; `balance` continues to serve as "Current Balance".
const TABLE = 'ACCOUNT';

const NEW_COLUMNS = {
  // Basic information
  account_category: { type: DataTypes.STRING, allowNull: true }, // Current Asset, Fixed Asset, Current Liability, ...
  parent_account_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: TABLE, key: 'id' } },
  account_level: {
    type: DataTypes.ENUM('Main Account', 'Sub Account'),
    allowNull: true,
    defaultValue: 'Main Account'
  },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },
  opening_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    allowNull: true,
    defaultValue: 'Active'
  },

  // Financial information
  budget_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  actual_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  available_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  credit_limit: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Account details
  account_description: { type: DataTypes.TEXT, allowNull: true },
  normal_balance: { type: DataTypes.ENUM('Debit', 'Credit'), allowNull: true },
  reconciliation_required: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
  allow_manual_entry: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
  tax_applicable: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
  tax_code: { type: DataTypes.ENUM('GST', 'TDS', 'Other'), allowNull: true },

  // Bank account details (optional)
  bank_name: { type: DataTypes.STRING, allowNull: true },
  bank_branch_name: { type: DataTypes.STRING, allowNull: true },
  account_holder_name: { type: DataTypes.STRING, allowNull: true },
  bank_account_number: { type: DataTypes.STRING, allowNull: true },
  ifsc_code: { type: DataTypes.STRING, allowNull: true },
  swift_code: { type: DataTypes.STRING, allowNull: true },
  upi_id: { type: DataTypes.STRING, allowNull: true },

  // System fields (created_at/updated_at already exist via timestamps)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  last_transaction_date: { type: DataTypes.DATE, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true }
};

async function up(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  for (const [name, definition] of Object.entries(NEW_COLUMNS)) {
    if (!columns[name]) {
      await queryInterface.addColumn(TABLE, name, definition);
    }
  }

  // "Account Code" is spec'd as unique. Only add the constraint if the
  // existing data actually is unique (ignoring NULL/blank codes) — running
  // this against a DB that already has duplicate codes should not crash
  // the whole migration chain; application-level validation still enforces
  // uniqueness on create/update either way (see accountService.js).
  try {
    const [dupes] = await queryInterface.sequelize.query(
      `SELECT code FROM ${TABLE} WHERE code IS NOT NULL AND code <> '' GROUP BY code HAVING COUNT(*) > 1`
    );
    if (!dupes.length) {
      await queryInterface.addIndex(TABLE, ['code'], { unique: true, name: 'account_code_unique' });
    }
  } catch (err) {
    // Index already exists, or dialect doesn't support the lookup query — safe to skip.
  }
}

async function down(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  for (const name of Object.keys(NEW_COLUMNS)) {
    if (columns[name]) {
      await queryInterface.removeColumn(TABLE, name);
    }
  }
  try {
    await queryInterface.removeIndex(TABLE, 'account_code_unique');
  } catch (err) {
    // Index may not exist — safe to skip.
  }
}

async function run() {
  const action = (process.argv[2] || 'up').toLowerCase();
  const queryInterface = sequelize.getQueryInterface();
  if (action === 'up') return up(queryInterface);
  if (action === 'down') return down(queryInterface);
  throw new Error("Unknown action. Use 'up' or 'down'.");
}

if (require.main === module) {
  run()
    .then(() => { console.log(`Migration ${process.argv[2] || 'up'} completed successfully.`); process.exit(0); })
    .catch((error) => { console.error(error); process.exit(1); });
}

module.exports = { up, down };

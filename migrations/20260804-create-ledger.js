const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'LEDGER';

// Field set mirrors the "Accounting CRM - Ledger Module" PDF spec.
// Ledger is a master record (like Chart of Accounts) that groups together
// everything a ledger needs: its own identity/hierarchy (Basic
// information), the GL account it posts to (Account Information), the
// customer/vendor it represents if any (Party Information), optional bank
// details, notes, and audit fields. The day-to-day debit/credit statement
// itself (Transaction Details section of the PDF) continues to be derived
// from JOURNAL_ENTRY / JOURNAL_LINE via the existing ledger statement
// endpoint — this table is the ledger's master data, not its transactions.
async function up(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (tables.map((t) => t.toLowerCase()).includes(TABLE.toLowerCase())) return;

  await queryInterface.createTable(TABLE, {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    // Basic information
    ledger_code: { type: DataTypes.STRING, allowNull: true, unique: true },
    ledger_name: { type: DataTypes.STRING, allowNull: false },
    ledger_type: { type: DataTypes.ENUM('customer', 'vendor', 'bank', 'cash', 'expense', 'income'), allowNull: true },
    ledger_group: { type: DataTypes.ENUM('assets', 'liabilities', 'income', 'expenses', 'equity'), allowNull: true },
    parent_ledger_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: TABLE, key: 'id' } },
    opening_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
    current_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
    balance_type: { type: DataTypes.ENUM('debit', 'credit'), allowNull: true, defaultValue: 'debit' },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: true, defaultValue: 'active' },

    // Account information
    account_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'ACCOUNT', key: 'id' } },
    account_code: { type: DataTypes.STRING, allowNull: true },
    account_category: { type: DataTypes.ENUM('Asset', 'Liability', 'Income', 'Expense', 'Equity'), allowNull: true },
    currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },

    // Party information
    party_type: { type: DataTypes.ENUM('client', 'vendor', 'other'), allowNull: true },
    client_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'CLIENT', key: 'id' } },
    vendor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'VENDOR', key: 'id' } },
    party_name: { type: DataTypes.STRING, allowNull: true },
    contact_person: { type: DataTypes.STRING, allowNull: true },
    mobile_number: { type: DataTypes.STRING, allowNull: true },
    email_address: { type: DataTypes.STRING, allowNull: true },

    // Bank details (optional)
    bank_account_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'BANK_ACCOUNT', key: 'id' } },
    bank_name: { type: DataTypes.STRING, allowNull: true },
    bank_account_number: { type: DataTypes.STRING, allowNull: true },
    ifsc_code: { type: DataTypes.STRING, allowNull: true },
    branch_name: { type: DataTypes.STRING, allowNull: true },

    // Notes
    remarks: { type: DataTypes.TEXT, allowNull: true },
    internal_notes: { type: DataTypes.TEXT, allowNull: true },

    // System fields (created_at/updated_at below cover Created Date /
    // Updated Date / Last Modified automatically)
    created_by: { type: DataTypes.STRING, allowNull: true },
    updated_by: { type: DataTypes.STRING, allowNull: true },
    last_transaction_date: { type: DataTypes.DATE, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });
}

async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (tables.map((t) => t.toLowerCase()).includes(TABLE.toLowerCase())) {
    await queryInterface.dropTable(TABLE);
  }
}

async function run() {
  const action = (process.argv[2] || 'up').toLowerCase();
  const queryInterface = sequelize.getQueryInterface();

  if (action === 'up') {
    await up(queryInterface);
    return;
  }

  if (action === 'down') {
    await down(queryInterface);
    return;
  }

  throw new Error("Unknown action. Use 'up' or 'down'.");
}

if (require.main === module) {
  run()
    .then(() => {
      console.log(`Migration ${process.argv[2] || 'up'} completed successfully.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { up, down };

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'BANK_ACCOUNT';

// All new columns being added to the BANK_ACCOUNT table, keyed by column name.
// Field set mirrors the "Accounting CRM - Bank Account Module" PDF spec.
// account_name, account_number, bank_name and balance already exist on
// BANK_ACCOUNT (balance == "Current Balance") and are kept as-is.
const NEW_COLUMNS = {
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
};

async function up(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  for (const [name, definition] of Object.entries(NEW_COLUMNS)) {
    if (!columns[name]) {
      await queryInterface.addColumn(TABLE, name, definition);
    }
  }
}

async function down(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  for (const name of Object.keys(NEW_COLUMNS)) {
    if (columns[name]) {
      await queryInterface.removeColumn(TABLE, name);
    }
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

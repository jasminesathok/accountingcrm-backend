const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'TRANSACTION';

// Field set mirrors the "Accounting CRM - Transaction Module" PDF spec.
// id, amount, date, account_id, bank_account_id, reference_type,
// reference_id and description already exist on TRANSACTION and are kept
// as-is (account_id doubles as "Chart of Account", reference_type/
// reference_id keep linking a transaction to the invoice/bill/payment
// record that generated it — reference_number below is the free-text
// reference from the PDF's Basic Information section).
const NEW_COLUMNS = {
  // Basic information
  transaction_number: { type: DataTypes.STRING, allowNull: true, unique: true },
  voucher_number: { type: DataTypes.STRING, allowNull: true },
  reference_number: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'completed', 'cancelled'), allowNull: true, defaultValue: 'completed' },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },

  // Account information
  debit_account_id: { type: DataTypes.INTEGER, allowNull: true },
  credit_account_id: { type: DataTypes.INTEGER, allowNull: true },
  account_category: { type: DataTypes.ENUM('Asset', 'Liability', 'Equity', 'Income', 'Expense'), allowNull: true },

  // Party information
  party_type: { type: DataTypes.ENUM('client', 'vendor', 'other'), allowNull: true },
  client_id: { type: DataTypes.INTEGER, allowNull: true },
  vendor_id: { type: DataTypes.INTEGER, allowNull: true },
  party_name: { type: DataTypes.STRING, allowNull: true },
  contact_person: { type: DataTypes.STRING, allowNull: true },
  mobile_number: { type: DataTypes.STRING, allowNull: true },
  email_address: { type: DataTypes.STRING, allowNull: true },

  // Transaction details
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

  // Attachments
  receipt_upload: { type: DataTypes.STRING, allowNull: true },
  invoice_bill_attachment: { type: DataTypes.STRING, allowNull: true },
  supporting_documents: { type: DataTypes.STRING, allowNull: true },

  // Notes
  remarks: { type: DataTypes.TEXT, allowNull: true },
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // System fields (created_at/updated_at handled automatically by Sequelize
  // timestamps == "Created Date" / "Last Modified"; updated_by covers
  // "Updated By" too)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.STRING, allowNull: true },
  approval_date: { type: DataTypes.DATE, allowNull: true }
};

async function up(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  for (const [name, definition] of Object.entries(NEW_COLUMNS)) {
    if (!columns[name]) {
      await queryInterface.addColumn(TABLE, name, definition);
    }
  }

  // Widen the transaction "type" ENUM to include Journal (PDF: Income /
  // Expense / Transfer / Journal). No-op if already widened.
  await queryInterface.changeColumn(TABLE, 'type', {
    type: DataTypes.ENUM('income', 'expense', 'transfer', 'journal'),
    allowNull: false
  });
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

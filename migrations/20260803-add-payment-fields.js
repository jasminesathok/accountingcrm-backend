const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'PAYMENT';

// All new columns being added to the PAYMENT table, keyed by column name.
// Field set mirrors the "Accounting CRM - Payment Module" PDF spec.
// invoice_id, bill_id, amount and payment_date already exist on PAYMENT
// (amount == "Amount Paid", payment_date == "Payment Date") and are kept as-is.
const NEW_COLUMNS = {
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

  // Invoice / Bill details (amount_paid mirrors existing `amount` column,
  // kept separate so the module matches the PDF field name in the UI/API)
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

  // System fields (created_at/updated_at handled automatically by Sequelize timestamps)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  payment_confirmation_date: { type: DataTypes.DATE, allowNull: true }
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

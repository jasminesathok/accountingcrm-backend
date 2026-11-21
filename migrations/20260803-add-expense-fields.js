const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'EXPENSE';

// All new columns being added to the EXPENSE table, keyed by column name.
// Field set mirrors the "Accounting CRM - Expenses Module" PDF spec.
// vendor_id, amount, category and date already exist on EXPENSE
// (amount == "Total Amount", date == "Expense Date", category == "Expense Category")
// and are kept as-is.
const NEW_COLUMNS = {
  // Basic information
  expense_number: { type: DataTypes.STRING, allowNull: true, unique: true },
  expense_type: { type: DataTypes.ENUM('business', 'personal', 'operational'), allowNull: true, defaultValue: 'business' },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'paid'), allowNull: true, defaultValue: 'pending' },
  reference_number: { type: DataTypes.STRING, allowNull: true },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },

  // Vendor / Payee information
  payee_name: { type: DataTypes.STRING, allowNull: true },
  contact_person: { type: DataTypes.STRING, allowNull: true },
  mobile_number: { type: DataTypes.STRING, allowNull: true },
  email_address: { type: DataTypes.STRING, allowNull: true },

  // Expense details
  expense_name: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  quantity: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 1 },
  unit_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  tax_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Tax details
  gst_number: { type: DataTypes.STRING, allowNull: true },
  gst_type: { type: DataTypes.ENUM('cgst', 'sgst', 'igst'), allowNull: true },
  taxable_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  total_tax: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Payment details
  payment_method: { type: DataTypes.ENUM('cash', 'bank', 'upi', 'card', 'cheque'), allowNull: true },
  payment_mode: { type: DataTypes.ENUM('online', 'offline'), allowNull: true, defaultValue: 'offline' },
  payment_status: { type: DataTypes.ENUM('paid', 'unpaid', 'partial'), allowNull: true, defaultValue: 'unpaid' },
  paid_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  balance_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  transaction_id: { type: DataTypes.STRING, allowNull: true },
  bank_name: { type: DataTypes.STRING, allowNull: true },
  account_name: { type: DataTypes.STRING, allowNull: true },
  cheque_number: { type: DataTypes.STRING, allowNull: true },

  // Attachments & notes
  receipt_upload: { type: DataTypes.STRING, allowNull: true },
  bill_attachment: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // Approval details
  submitted_by: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.STRING, allowNull: true },
  approval_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: true, defaultValue: 'pending' },
  approval_date: { type: DataTypes.DATE, allowNull: true },

  // System fields (createdAt/updatedAt handled automatically by Sequelize timestamps)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true }
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

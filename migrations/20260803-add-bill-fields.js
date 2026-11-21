const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'BILL';

// All new columns being added to the BILL table, keyed by column name.
// Mirrors migrations/20260801-add-invoice-fields.js (Bill is the purchase-side
// counterpart of Invoice) but field names/values follow the Bill Module PDF
// spec exactly where the two differ (e.g. unit_cost vs unit_price on items,
// bill_attachment vs attachment).
const NEW_COLUMNS = {
  // Basic information
  bill_number: { type: DataTypes.STRING, allowNull: true, unique: true },
  bill_date: { type: DataTypes.DATEONLY, allowNull: true },
  bill_type: { type: DataTypes.ENUM('purchase_bill', 'service_bill'), allowNull: true, defaultValue: 'purchase_bill' },
  reference_number: { type: DataTypes.STRING, allowNull: true },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },

  // Vendor information (snapshot at time of billing)
  contact_person: { type: DataTypes.STRING, allowNull: true },
  mobile_number: { type: DataTypes.STRING, allowNull: true },
  email_address: { type: DataTypes.STRING, allowNull: true },
  billing_address: { type: DataTypes.TEXT, allowNull: true },
  gst_number: { type: DataTypes.STRING, allowNull: true },

  // Tax details (bill-level summary, rolled up from items)
  cgst: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  igst: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  total_tax: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  taxable_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Payment details (amount already exists on BILL and continues to serve
  // as the Grand Total used by the General Ledger / reports)
  sub_total: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  shipping_charges: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  other_charges: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  round_off: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  balance_due: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  payment_method: { type: DataTypes.ENUM('cash', 'bank', 'upi', 'card', 'cheque'), allowNull: true },
  payment_status: { type: DataTypes.ENUM('paid', 'partial', 'unpaid'), allowNull: true, defaultValue: 'unpaid' },

  // Attachments / tax details (documents)
  bill_attachment: { type: DataTypes.STRING, allowNull: true },
  terms_conditions: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // System fields (created_at/updated_at handled automatically by Sequelize timestamps)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.STRING, allowNull: true },
  approved_date: { type: DataTypes.DATE, allowNull: true },
  last_payment_date: { type: DataTypes.DATE, allowNull: true },
  outstanding_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 }
};

async function up(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  for (const [name, definition] of Object.entries(NEW_COLUMNS)) {
    if (!columns[name]) {
      await queryInterface.addColumn(TABLE, name, definition);
    }
  }

  // Extend the existing bill status enum instead of replacing it, so
  // 'partially_paid' and 'cancelled' become valid alongside the values
  // already in use ('draft', 'pending', 'paid', 'overdue').
  await queryInterface.changeColumn(TABLE, 'status', {
    type: DataTypes.ENUM('draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled'),
    defaultValue: 'pending'
  });
}

async function down(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  for (const name of Object.keys(NEW_COLUMNS)) {
    if (columns[name]) {
      await queryInterface.removeColumn(TABLE, name);
    }
  }

  await queryInterface.changeColumn(TABLE, 'status', {
    type: DataTypes.ENUM('draft', 'pending', 'paid', 'overdue'),
    defaultValue: 'pending'
  });
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

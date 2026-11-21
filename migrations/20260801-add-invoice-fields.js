const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'INVOICE';

// All new columns being added to the INVOICE table, keyed by column name.
// Kept as a map so `up`/`down` can loop instead of repeating boilerplate.
const NEW_COLUMNS = {
  // Basic information
  invoice_number: { type: DataTypes.STRING, allowNull: true, unique: true },
  invoice_date: { type: DataTypes.DATEONLY, allowNull: true },
  invoice_type: { type: DataTypes.ENUM('tax_invoice', 'proforma', 'credit_invoice'), allowNull: true, defaultValue: 'tax_invoice' },
  reference_number: { type: DataTypes.STRING, allowNull: true },
  sales_person: { type: DataTypes.STRING, allowNull: true },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },

  // Client information (snapshot at time of invoicing)
  contact_person: { type: DataTypes.STRING, allowNull: true },
  mobile_number: { type: DataTypes.STRING, allowNull: true },
  email_address: { type: DataTypes.STRING, allowNull: true },
  billing_address: { type: DataTypes.TEXT, allowNull: true },
  shipping_address: { type: DataTypes.TEXT, allowNull: true },
  gst_number: { type: DataTypes.STRING, allowNull: true },
  state_code: { type: DataTypes.STRING, allowNull: true },

  // Tax details (invoice-level summary)
  cgst: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  igst: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  total_tax: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  taxable_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Payment details
  sub_total: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  shipping_charges: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  other_charges: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  round_off: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  balance_due: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  payment_method: { type: DataTypes.ENUM('cash', 'bank', 'upi', 'card', 'cheque'), allowNull: true },
  payment_status: { type: DataTypes.ENUM('paid', 'partial', 'unpaid'), allowNull: true, defaultValue: 'unpaid' },

  // Bank details
  bank_name: { type: DataTypes.STRING, allowNull: true },
  account_holder_name: { type: DataTypes.STRING, allowNull: true },
  account_number: { type: DataTypes.STRING, allowNull: true },
  ifsc_code: { type: DataTypes.STRING, allowNull: true },
  upi_id: { type: DataTypes.STRING, allowNull: true },

  // Documents & notes
  terms_conditions: { type: DataTypes.TEXT, allowNull: true },
  customer_notes: { type: DataTypes.TEXT, allowNull: true },
  internal_notes: { type: DataTypes.TEXT, allowNull: true },
  attachment: { type: DataTypes.STRING, allowNull: true },

  // System fields
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  sent_date: { type: DataTypes.DATE, allowNull: true },
  paid_date: { type: DataTypes.DATE, allowNull: true },
  last_reminder_date: { type: DataTypes.DATE, allowNull: true },
  print_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  email_status: { type: DataTypes.ENUM('not_sent', 'sent', 'failed'), allowNull: true, defaultValue: 'not_sent' },
  pdf_status: { type: DataTypes.ENUM('generated', 'not_generated'), allowNull: true, defaultValue: 'not_generated' }
};

async function up(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  for (const [name, definition] of Object.entries(NEW_COLUMNS)) {
    if (!columns[name]) {
      await queryInterface.addColumn(TABLE, name, definition);
    }
  }

  // Extend the existing invoice status enum instead of replacing it, so
  // 'sent', 'partially_paid' and 'cancelled' become valid alongside the
  // values already in use ('draft', 'pending', 'paid', 'overdue').
  await queryInterface.changeColumn(TABLE, 'status', {
    type: DataTypes.ENUM('draft', 'pending', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'),
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

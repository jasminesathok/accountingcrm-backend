const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'VENDOR';

const NEW_COLUMNS = {
  // Basic information
  vendor_code: { type: DataTypes.STRING, allowNull: true, unique: true },
  vendor_type: { type: DataTypes.ENUM('individual', 'business'), allowNull: true, defaultValue: 'business' },
  industry: { type: DataTypes.STRING, allowNull: true },
  vendor_since: { type: DataTypes.DATEONLY, allowNull: true },

  // Contact information
  designation: { type: DataTypes.STRING, allowNull: true },
  alternate_mobile: { type: DataTypes.STRING, allowNull: true },
  alternate_email: { type: DataTypes.STRING, allowNull: true },
  website: { type: DataTypes.STRING, allowNull: true },

  // Address details
  billing_address: { type: DataTypes.TEXT, allowNull: true },
  shipping_address: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING, allowNull: true },
  state: { type: DataTypes.STRING, allowNull: true },
  country: { type: DataTypes.STRING, allowNull: true },
  pin_code: { type: DataTypes.STRING, allowNull: true },

  // Tax details
  pan_number: { type: DataTypes.STRING, allowNull: true },
  tan_number: { type: DataTypes.STRING, allowNull: true },
  cin_number: { type: DataTypes.STRING, allowNull: true },
  msme_number: { type: DataTypes.STRING, allowNull: true },
  tax_type: { type: DataTypes.ENUM('gst', 'non_gst'), allowNull: true, defaultValue: 'gst' },
  gst_state_code: { type: DataTypes.STRING, allowNull: true },

  // Financial details
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },
  credit_limit: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  payment_terms: { type: DataTypes.STRING, allowNull: true },
  opening_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  outstanding_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  credit_days: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  default_purchase_discount: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },

  // Bank details
  bank_name: { type: DataTypes.STRING, allowNull: true },
  account_holder_name: { type: DataTypes.STRING, allowNull: true },
  account_number: { type: DataTypes.STRING, allowNull: true },
  ifsc_code: { type: DataTypes.STRING, allowNull: true },
  branch_name: { type: DataTypes.STRING, allowNull: true },
  upi_id: { type: DataTypes.STRING, allowNull: true },

  // Purchase information
  purchase_representative: { type: DataTypes.STRING, allowNull: true },
  vendor_category: { type: DataTypes.ENUM('local', 'national', 'international'), allowNull: true },
  products_supplied: { type: DataTypes.TEXT, allowNull: true },
  preferred_payment_method: { type: DataTypes.ENUM('cash', 'bank', 'upi', 'cheque'), allowNull: true },
  delivery_terms: { type: DataTypes.TEXT, allowNull: true },

  // Document uploads (file paths / URLs)
  gst_certificate: { type: DataTypes.STRING, allowNull: true },
  pan_card: { type: DataTypes.STRING, allowNull: true },
  business_license: { type: DataTypes.STRING, allowNull: true },
  bank_proof: { type: DataTypes.STRING, allowNull: true },
  agreement: { type: DataTypes.STRING, allowNull: true },
  other_documents: { type: DataTypes.TEXT, allowNull: true },

  // Communication preferences
  email_notifications: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
  sms_notifications: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
  whatsapp_notifications: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },

  // Notes & remarks
  internal_notes: { type: DataTypes.TEXT, allowNull: true },
  vendor_remarks: { type: DataTypes.TEXT, allowNull: true },

  // System fields
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  last_purchase_date: { type: DataTypes.DATE, allowNull: true },
  total_purchases: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  total_payments: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  outstanding_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 }
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

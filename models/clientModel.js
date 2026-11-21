const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Client = sequelize.define('Client', {
  // Basic information
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  client_code: { type: DataTypes.STRING, unique: true },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  client_type: { type: DataTypes.ENUM('individual', 'business'), defaultValue: 'individual' },
  company_name: DataTypes.STRING,
  industry: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  client_since: DataTypes.DATEONLY,

  // Contact information
  contact_person: DataTypes.STRING,
  designation: DataTypes.STRING,
  email: DataTypes.STRING, // Primary Email Address
  alternate_email: DataTypes.STRING,
  phone: DataTypes.STRING, // Primary Mobile Number
  alternate_mobile: DataTypes.STRING,
  website: DataTypes.STRING,

  // Address details
  billing_address: DataTypes.TEXT,
  shipping_address: DataTypes.TEXT,
  city: DataTypes.STRING,
  state: DataTypes.STRING,
  country: DataTypes.STRING,
  pin_code: DataTypes.STRING,

  // Tax details
  gst_number: DataTypes.STRING,
  pan_number: DataTypes.STRING,
  tan_number: DataTypes.STRING,
  cin_number: DataTypes.STRING,
  msme_number: DataTypes.STRING,
  tax_type: { type: DataTypes.ENUM('gst', 'non_gst'), defaultValue: 'gst' },
  gst_state_code: DataTypes.STRING,

  // Financial details
  currency: { type: DataTypes.STRING, defaultValue: 'INR' },
  credit_limit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  payment_terms: DataTypes.STRING,
  opening_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  outstanding_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  credit_days: { type: DataTypes.INTEGER, defaultValue: 0 },
  price_list: DataTypes.STRING,
  discount_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },

  // Bank details
  bank_name: DataTypes.STRING,
  account_holder_name: DataTypes.STRING,
  account_number: DataTypes.STRING,
  ifsc_code: DataTypes.STRING,
  branch_name: DataTypes.STRING,
  upi_id: DataTypes.STRING,

  // Sales information
  sales_representative: DataTypes.STRING,
  lead_source: DataTypes.ENUM('website', 'referral', 'call', 'other'),
  customer_category: DataTypes.ENUM('regular', 'vip', 'wholesale'),
  territory: DataTypes.STRING,
  preferred_contact_method: DataTypes.ENUM('phone', 'email', 'sms', 'whatsapp'),

  // Document uploads (file paths / URLs)
  gst_certificate: DataTypes.STRING,
  pan_card: DataTypes.STRING,
  business_license: DataTypes.STRING,
  agreement: DataTypes.STRING,
  other_documents: DataTypes.TEXT,

  // Communication preferences
  email_notifications: { type: DataTypes.BOOLEAN, defaultValue: true },
  sms_notifications: { type: DataTypes.BOOLEAN, defaultValue: false },
  whatsapp_notifications: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Notes & remarks
  internal_notes: DataTypes.TEXT,
  customer_remarks: DataTypes.TEXT,

  // System fields (created_at/updated_at handled automatically by Sequelize timestamps)
  created_by: DataTypes.STRING,
  updated_by: DataTypes.STRING,
  last_contact_date: DataTypes.DATE,
  last_invoice_date: DataTypes.DATE,
  total_sales: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_payments: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  outstanding_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, {
  tableName: 'CLIENT'
});

module.exports = Client;

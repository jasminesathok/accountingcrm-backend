const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Client = require('./clientModel');
const InvoiceItem = require('./invoiceItemModel');

const Invoice = sequelize.define('Invoice', {
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Client, key: 'id' }
  },

  // Basic information
  invoice_number: { type: DataTypes.STRING, unique: true },
  invoice_date: DataTypes.DATEONLY,
  invoice_type: {
    type: DataTypes.ENUM('tax_invoice', 'proforma', 'credit_invoice'),
    defaultValue: 'tax_invoice'
  },
  reference_number: DataTypes.STRING,
  sales_person: DataTypes.STRING,
  currency: { type: DataTypes.STRING, defaultValue: 'INR' },
  // A/R Aging Module PDF — Report Filters > Branch
  branch: DataTypes.STRING,

  // Invoice status (extended: draft / pending / sent / paid / partially_paid / overdue / cancelled)
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'),
    defaultValue: 'pending'
  },
  due_date: DataTypes.DATEONLY,

  // Client information (snapshot at time of invoicing)
  contact_person: DataTypes.STRING,
  mobile_number: DataTypes.STRING,
  email_address: DataTypes.STRING,
  billing_address: DataTypes.TEXT,
  shipping_address: DataTypes.TEXT,
  gst_number: DataTypes.STRING,
  state_code: DataTypes.STRING,

  // Tax details (invoice-level summary, GST breakup)
  cgst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  igst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_tax: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  taxable_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  // Payment / totals
  sub_total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  shipping_charges: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  other_charges: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  round_off: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  }, // Grand Total
  amount_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance_due: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  payment_method: DataTypes.ENUM('cash', 'bank', 'upi', 'card', 'cheque'),
  payment_status: {
    type: DataTypes.ENUM('paid', 'partial', 'unpaid'),
    defaultValue: 'unpaid'
  },

  // Bank details
  bank_name: DataTypes.STRING,
  account_holder_name: DataTypes.STRING,
  account_number: DataTypes.STRING,
  ifsc_code: DataTypes.STRING,
  upi_id: DataTypes.STRING,

  // Documents & notes
  terms_conditions: DataTypes.TEXT,
  customer_notes: DataTypes.TEXT,
  internal_notes: DataTypes.TEXT,
  attachment: DataTypes.STRING,

  // System fields (created_at/updated_at are handled automatically by Sequelize timestamps)
  created_by: DataTypes.STRING,
  updated_by: DataTypes.STRING,
  sent_date: DataTypes.DATE,
  paid_date: DataTypes.DATE,
  last_reminder_date: DataTypes.DATE,
  print_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  email_status: {
    type: DataTypes.ENUM('not_sent', 'sent', 'failed'),
    defaultValue: 'not_sent'
  },
  pdf_status: {
    type: DataTypes.ENUM('generated', 'not_generated'),
    defaultValue: 'not_generated'
  }
}, {
  tableName: 'INVOICE'
});

// Associations
Invoice.belongsTo(Client, { foreignKey: 'client_id' });
Client.hasMany(Invoice, { foreignKey: 'client_id' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items', onDelete: 'CASCADE' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });

module.exports = Invoice;

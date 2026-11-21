const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Vendor = require('./vendorModel');
const BillItem = require('./billItemModel');

const Bill = sequelize.define('Bill', {
  vendor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Vendor, key: 'id' }
  },

  // amount is the bill's Grand Total — kept as the single field the General
  // Ledger / Accounts Payable / reportService already post and read from
  // (see services/billService.js), rather than introducing a second
  // "grand total" column that could drift out of sync with it.
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },

  // Bill Status (extended: draft / pending / paid / partially_paid / overdue / cancelled)
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled'),
    defaultValue: 'pending'
  },
  due_date: DataTypes.DATEONLY,

  // Basic information
  bill_number: { type: DataTypes.STRING, unique: true },
  bill_date: DataTypes.DATEONLY,
  bill_type: {
    type: DataTypes.ENUM('purchase_bill', 'service_bill'),
    defaultValue: 'purchase_bill'
  },
  reference_number: DataTypes.STRING,
  currency: { type: DataTypes.STRING, defaultValue: 'INR' },

  // Vendor information (snapshot at time of billing)
  contact_person: DataTypes.STRING,
  mobile_number: DataTypes.STRING,
  email_address: DataTypes.STRING,
  billing_address: DataTypes.TEXT,
  gst_number: DataTypes.STRING,

  // Tax details (bill-level summary, GST breakup)
  cgst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  igst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_tax: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  taxable_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  // Payment details
  sub_total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  shipping_charges: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  other_charges: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  round_off: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance_due: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  payment_method: DataTypes.ENUM('cash', 'bank', 'upi', 'card', 'cheque'),
  payment_status: {
    type: DataTypes.ENUM('paid', 'partial', 'unpaid'),
    defaultValue: 'unpaid'
  },

  // A/P Aging Module PDF — Report Filters (Branch, Department)
  branch: { type: DataTypes.STRING, allowNull: true },
  department: { type: DataTypes.STRING, allowNull: true },

  // Attachments / tax details (documents)
  bill_attachment: DataTypes.STRING,
  terms_conditions: DataTypes.TEXT,
  notes: DataTypes.TEXT,
  internal_notes: DataTypes.TEXT,

  // System fields (created_at/updated_at handled automatically by Sequelize timestamps)
  created_by: DataTypes.STRING,
  updated_by: DataTypes.STRING,
  approved_by: DataTypes.STRING,
  approved_date: DataTypes.DATE,
  last_payment_date: DataTypes.DATE,
  outstanding_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, {
  tableName: 'BILL'
});

Bill.belongsTo(Vendor, { foreignKey: 'vendor_id' });
Vendor.hasMany(Bill, { foreignKey: 'vendor_id' });

Bill.hasMany(BillItem, { foreignKey: 'bill_id', as: 'items', onDelete: 'CASCADE' });
BillItem.belongsTo(Bill, { foreignKey: 'bill_id' });

module.exports = Bill;

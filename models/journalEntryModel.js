const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Journal Entries Module PDF (Accounting CRM spec) fields, grouped exactly
// as the spec lays them out: Basic Information, Account Details (on
// JournalLine), Party Information, Tax Details, Attachments, Approval
// Details, Notes and System Fields.
const JournalEntry = sequelize.define('JournalEntry', {
  // ---- Basic information ----
  // Journal Entry ID -> Sequelize `id` (auto-generated primary key)
  journal_number: { type: DataTypes.STRING, allowNull: true, unique: true }, // Journal Number
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }, // Entry Date
  journal_type: {
    type: DataTypes.ENUM('General', 'Adjustment', 'Opening', 'Closing', 'Recurring'),
    allowNull: true,
    defaultValue: 'General'
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reference_id'
  },
  posting_period: { type: DataTypes.STRING, allowNull: true }, // Financial month/year e.g. "2026-08"
  status: {
    type: DataTypes.ENUM('Draft', 'Posted', 'Approved', 'Cancelled'),
    allowNull: true,
    defaultValue: 'Draft'
  },

  description: DataTypes.STRING,
  // Ledger Module PDF > Transaction Details: Voucher Number, Voucher Type,
  // Reference Number (Invoice/Bill reference) shown on each ledger line.
  voucher_number: { type: DataTypes.STRING, allowNull: true },
  voucher_type: {
    type: DataTypes.ENUM('journal', 'payment', 'receipt', 'contra', 'sales', 'purchase'),
    allowNull: true,
    defaultValue: 'journal'
  },
  reference_number: { type: DataTypes.STRING, allowNull: true },

  // ---- Party information ----
  client_id: { type: DataTypes.INTEGER, allowNull: true },
  vendor_id: { type: DataTypes.INTEGER, allowNull: true },
  contact_person: { type: DataTypes.STRING, allowNull: true },
  invoice_bill_number: { type: DataTypes.STRING, allowNull: true },
  transaction_reference: { type: DataTypes.STRING, allowNull: true },

  // ---- Tax details ----
  tax_type: { type: DataTypes.ENUM('GST', 'TDS', 'Other'), allowNull: true },
  tax_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  tax_account_id: { type: DataTypes.INTEGER, allowNull: true },

  // ---- Attachments ----
  supporting_documents: { type: DataTypes.STRING, allowNull: true },
  invoice_attachment: { type: DataTypes.STRING, allowNull: true },
  receipt_attachment: { type: DataTypes.STRING, allowNull: true },

  // ---- Approval details ----
  prepared_by: { type: DataTypes.STRING, allowNull: true },
  reviewed_by: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.STRING, allowNull: true },
  approval_status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    allowNull: true,
    defaultValue: 'Pending'
  },
  approval_date: { type: DataTypes.DATE, allowNull: true },

  // ---- Notes ----
  // `description` above doubles as the Narration field; internal_notes is
  // the staff-only note from the spec.
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // ---- System fields ----
  // created_at / updated_at (Created Date / Updated Date / Last Modified)
  // are added automatically by Sequelize timestamps in config/db.js.
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  posted_by: { type: DataTypes.STRING, allowNull: true },
  posted_date: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'JOURNAL_ENTRY'
});

module.exports = JournalEntry;

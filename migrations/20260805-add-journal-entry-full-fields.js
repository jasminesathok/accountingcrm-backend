const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Journal Entries Module PDF (Accounting CRM spec) — brings JOURNAL_ENTRY /
// JOURNAL_LINE up to the full field list: Basic Information, Party
// Information, Tax Details, Attachments, Approval Details, Notes and
// System Fields. voucher_number/voucher_type/reference_number/date/
// description already exist from earlier migrations.
const ENTRY_TABLE = 'JOURNAL_ENTRY';
const LINE_TABLE = 'JOURNAL_LINE';

const ENTRY_NEW_COLUMNS = {
  // Basic information
  journal_number: { type: DataTypes.STRING, allowNull: true },
  journal_type: {
    type: DataTypes.ENUM('General', 'Adjustment', 'Opening', 'Closing', 'Recurring'),
    allowNull: true,
    defaultValue: 'General'
  },
  posting_period: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM('Draft', 'Posted', 'Approved', 'Cancelled'),
    allowNull: true,
    defaultValue: 'Draft'
  },

  // Party information
  client_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'CLIENT', key: 'id' } },
  vendor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'VENDOR', key: 'id' } },
  contact_person: { type: DataTypes.STRING, allowNull: true },
  invoice_bill_number: { type: DataTypes.STRING, allowNull: true },
  transaction_reference: { type: DataTypes.STRING, allowNull: true },

  // Tax details
  tax_type: { type: DataTypes.ENUM('GST', 'TDS', 'Other'), allowNull: true },
  tax_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  tax_account_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'ACCOUNT', key: 'id' } },

  // Attachments
  supporting_documents: { type: DataTypes.STRING, allowNull: true },
  invoice_attachment: { type: DataTypes.STRING, allowNull: true },
  receipt_attachment: { type: DataTypes.STRING, allowNull: true },

  // Approval details
  prepared_by: { type: DataTypes.STRING, allowNull: true },
  reviewed_by: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.STRING, allowNull: true },
  approval_status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    allowNull: true,
    defaultValue: 'Pending'
  },
  approval_date: { type: DataTypes.DATE, allowNull: true },

  // Notes (Description/date already double as the header narration;
  // internal_notes is the staff-only field from the spec)
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // System fields (created_at/updated_at already exist via timestamps)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  posted_by: { type: DataTypes.STRING, allowNull: true },
  posted_date: { type: DataTypes.DATE, allowNull: true }
};

const LINE_NEW_COLUMNS = {
  // Account Details > Description (per-line narration)
  description: { type: DataTypes.STRING, allowNull: true }
};

async function up(queryInterface) {
  const entryColumns = await queryInterface.describeTable(ENTRY_TABLE);
  for (const [name, definition] of Object.entries(ENTRY_NEW_COLUMNS)) {
    if (!entryColumns[name]) {
      await queryInterface.addColumn(ENTRY_TABLE, name, definition);
    }
  }

  const lineColumns = await queryInterface.describeTable(LINE_TABLE);
  for (const [name, definition] of Object.entries(LINE_NEW_COLUMNS)) {
    if (!lineColumns[name]) {
      await queryInterface.addColumn(LINE_TABLE, name, definition);
    }
  }
}

async function down(queryInterface) {
  const entryColumns = await queryInterface.describeTable(ENTRY_TABLE);
  for (const name of Object.keys(ENTRY_NEW_COLUMNS)) {
    if (entryColumns[name]) {
      await queryInterface.removeColumn(ENTRY_TABLE, name);
    }
  }

  const lineColumns = await queryInterface.describeTable(LINE_TABLE);
  for (const name of Object.keys(LINE_NEW_COLUMNS)) {
    if (lineColumns[name]) {
      await queryInterface.removeColumn(LINE_TABLE, name);
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

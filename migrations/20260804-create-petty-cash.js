const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'PETTY_CASH';

async function up(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (tables.map((t) => t.toLowerCase()).includes(TABLE.toLowerCase())) return;

  await queryInterface.createTable(TABLE, {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },

    // Basic information
    petty_cash_code: { type: DataTypes.STRING, allowNull: true, unique: true },
    voucher_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    transaction_date: { type: DataTypes.DATEONLY, allowNull: true },
    transaction_type: { type: DataTypes.ENUM('receipt', 'payment'), allowNull: true, defaultValue: 'payment' },
    expense_category: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: true, defaultValue: 'pending' },

    // Payee / Received From details
    payee_name: { type: DataTypes.STRING, allowNull: true },
    department: { type: DataTypes.STRING, allowNull: true },
    contact_number: { type: DataTypes.STRING, allowNull: true },
    purpose: { type: DataTypes.TEXT, allowNull: true },

    // Transaction details
    description: { type: DataTypes.TEXT, allowNull: true },
    payment_method: { type: DataTypes.STRING, allowNull: true, defaultValue: 'cash' },
    reference_number: { type: DataTypes.STRING, allowNull: true },
    receipt_number: { type: DataTypes.STRING, allowNull: true },
    bill_number: { type: DataTypes.STRING, allowNull: true },
    amount_received: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
    amount_paid: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
    balance_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

    // Approval details
    requested_by: { type: DataTypes.STRING, allowNull: true },
    approved_by: { type: DataTypes.STRING, allowNull: true },
    approval_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: true, defaultValue: 'pending' },
    approval_date: { type: DataTypes.DATEONLY, allowNull: true },

    // Attachments
    receipt_upload: { type: DataTypes.STRING, allowNull: true },
    bill_attachment: { type: DataTypes.STRING, allowNull: true },
    supporting_documents: { type: DataTypes.STRING, allowNull: true },

    // Notes
    remarks: { type: DataTypes.TEXT, allowNull: true },
    internal_notes: { type: DataTypes.TEXT, allowNull: true },

    // System fields
    created_by: { type: DataTypes.STRING, allowNull: true },
    updated_by: { type: DataTypes.STRING, allowNull: true },
    last_modified: { type: DataTypes.DATE, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });
}

async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (tables.map((t) => t.toLowerCase()).includes(TABLE.toLowerCase())) {
    await queryInterface.dropTable(TABLE);
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

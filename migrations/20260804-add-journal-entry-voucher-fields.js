const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'JOURNAL_ENTRY';

// Ledger Module PDF > Transaction Details needs Voucher Number, Voucher
// Type and Reference Number on every ledger line. Ledger lines are read
// from JOURNAL_LINE joined to JOURNAL_ENTRY, so these columns live on
// JOURNAL_ENTRY (one per posting, same as the existing date/description).
const NEW_COLUMNS = {
  voucher_number: { type: DataTypes.STRING, allowNull: true },
  voucher_type: {
    type: DataTypes.ENUM('journal', 'payment', 'receipt', 'contra', 'sales', 'purchase'),
    allowNull: true,
    defaultValue: 'journal'
  },
  reference_number: { type: DataTypes.STRING, allowNull: true }
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

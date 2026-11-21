const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'INVOICE';

// A/R Aging Module PDF:
//  - Report Filters > Branch needs a real column on INVOICE to filter
//    against (same pattern used for Account.branch in the Trial Balance
//    migration — this codebase has no separate Branch entity).
async function up(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);

  if (!columns.branch) {
    await queryInterface.addColumn(TABLE, 'branch', { type: DataTypes.STRING, allowNull: true });
  }
}

async function down(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  if (columns.branch) {
    await queryInterface.removeColumn(TABLE, 'branch');
  }
}

async function run() {
  const action = (process.argv[2] || 'up').toLowerCase();
  const queryInterface = sequelize.getQueryInterface();
  if (action === 'up') return up(queryInterface);
  if (action === 'down') return down(queryInterface);
  throw new Error("Unknown action. Use 'up' or 'down'.");
}

if (require.main === module) {
  run()
    .then(() => { console.log(`Migration ${process.argv[2] || 'up'} completed successfully.`); process.exit(0); })
    .catch((error) => { console.error(error); process.exit(1); });
}

module.exports = { up, down };

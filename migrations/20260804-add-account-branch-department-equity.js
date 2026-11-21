const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'ACCOUNT';

// Trial Balance Module PDF:
//  - Account Details > Account Type must include "Equity" (was previously
//    missing from the ENUM even though Balance Sheet already queries for it).
//  - Report Filters > Branch, Department need real columns on ACCOUNT to
//    filter against (previously accepted as query params but not applied).
async function up(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);

  if (!columns.branch) {
    await queryInterface.addColumn(TABLE, 'branch', { type: DataTypes.STRING, allowNull: true });
  }
  if (!columns.department) {
    await queryInterface.addColumn(TABLE, 'department', { type: DataTypes.STRING, allowNull: true });
  }

  // Widen the type ENUM to include Equity (no-op if already widened).
  await queryInterface.changeColumn(TABLE, 'type', {
    type: DataTypes.ENUM('Asset', 'Liability', 'Equity', 'Income', 'Expense'),
    allowNull: false
  });
}

async function down(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  if (columns.branch) {
    await queryInterface.removeColumn(TABLE, 'branch');
  }
  if (columns.department) {
    await queryInterface.removeColumn(TABLE, 'department');
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

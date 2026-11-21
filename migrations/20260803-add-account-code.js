const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'ACCOUNT';

// Adds "Account Code" — the Trial Balance Module PDF's Account Details
// section lists it as a distinct field from the account's auto ID/name.
async function up(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  if (!columns.code) {
    await queryInterface.addColumn(TABLE, 'code', { type: DataTypes.STRING, allowNull: true });
  }
}

async function down(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  if (columns.code) {
    await queryInterface.removeColumn(TABLE, 'code');
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

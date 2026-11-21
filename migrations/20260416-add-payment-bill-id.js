const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'PAYMENT';

async function up(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  if (!columns.bill_id) {
    await queryInterface.addColumn(TABLE, 'bill_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'BILL',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  }
}

async function down(queryInterface) {
  const columns = await queryInterface.describeTable(TABLE);
  if (columns.bill_id) {
    await queryInterface.removeColumn(TABLE, 'bill_id');
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

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE = 'BILL_ITEM';

async function up(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (tables.map((t) => t.toLowerCase()).includes(TABLE.toLowerCase())) return;

  await queryInterface.createTable(TABLE, {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'BILL', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    product_service: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    hsn_sac_code: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 1 },
    unit: { type: DataTypes.STRING, allowNull: true },
    unit_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    discount_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
    discount_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
    tax_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
    line_total: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
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

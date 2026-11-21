const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLES = {
  journalEntry: 'JOURNAL_ENTRY',
  journalLine: 'JOURNAL_LINE',
  account: 'ACCOUNT'
};

async function up(queryInterface) {
  const journalEntryColumns = await queryInterface.describeTable(TABLES.journalEntry);

  if (!journalEntryColumns.reference_id) {
    await queryInterface.addColumn(TABLES.journalEntry, 'reference_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  }

  const tables = await queryInterface.showAllTables();
  const journalLineExists = tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toUpperCase() === TABLES.journalLine;
  });

  if (!journalLineExists) {
    await queryInterface.createTable(TABLES.journalLine, {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      journal_entry_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: TABLES.journalEntry,
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      account_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: TABLES.account,
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      debit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      credit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });
  }
}

async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const journalLineExists = tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toUpperCase() === TABLES.journalLine;
  });

  if (journalLineExists) {
    await queryInterface.dropTable(TABLES.journalLine);
  }

  const journalEntryColumns = await queryInterface.describeTable(TABLES.journalEntry);
  if (journalEntryColumns.reference_id) {
    await queryInterface.removeColumn(TABLES.journalEntry, 'reference_id');
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

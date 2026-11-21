const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const JournalEntry = require('./journalEntryModel');
const Account = require('./accountModel');

const JournalItem = sequelize.define('JournalItem', {
  journal_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: JournalEntry, key: 'id' }
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Account, key: 'id' }
  },
  debit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  credit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  }
}, {
  tableName: 'JOURNAL_ITEM'
});

JournalItem.belongsTo(JournalEntry, { foreignKey: 'journal_id' });
JournalEntry.hasMany(JournalItem, { foreignKey: 'journal_id' });
JournalItem.belongsTo(Account, { foreignKey: 'account_id' });

module.exports = JournalItem;

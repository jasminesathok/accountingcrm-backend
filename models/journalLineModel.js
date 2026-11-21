const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const JournalEntry = require('./journalEntryModel');
const Account = require('./accountModel');
const Client = require('./clientModel');
const Vendor = require('./vendorModel');

const JournalLine = sequelize.define('JournalLine', {
  journalEntryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'journal_entry_id',
    references: { model: JournalEntry, key: 'id' }
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'account_id',
    references: { model: Account, key: 'id' }
  },
  debit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  credit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  // Account Details > Description: narration specific to this line
  description: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'JOURNAL_LINE'
});

JournalLine.belongsTo(JournalEntry, { foreignKey: 'journalEntryId' });
JournalEntry.hasMany(JournalLine, { foreignKey: 'journalEntryId' });
JournalLine.belongsTo(Account, { foreignKey: 'accountId' });

// Party Information (Client/Vendor Name) and Tax Details (Tax Account)
// live on the JournalEntry header — wire the associations here so
// eager-loading in journalService can pull them in one query.
JournalEntry.belongsTo(Client, { foreignKey: 'client_id' });
JournalEntry.belongsTo(Vendor, { foreignKey: 'vendor_id' });
JournalEntry.belongsTo(Account, { foreignKey: 'tax_account_id', as: 'TaxAccount' });

module.exports = JournalLine;

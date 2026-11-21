const { Op } = require('sequelize');
const Account = require('../models/accountModel');
const JournalEntry = require('../models/journalEntryModel');
const JournalLine = require('../models/journalLineModel');
const Ledger = require('../models/ledgerModel');
const User = require('../models/userModel');

const toNumber = (value) => Number(parseFloat(value || 0).toFixed(2));

const sumLines = (lines) => lines.reduce(
  (total, line) => total + (parseFloat(line.debit) || 0) - (parseFloat(line.credit) || 0),
  0
);

const balanceTypeOf = (amount) => (toNumber(amount) < 0 ? 'Credit' : 'Debit');

const buildJournalWhere = ({ startDate, endDate, voucherType }) => {
  const where = {};
  if (startDate && endDate) {
    where.date = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.date = { [Op.gte]: startDate };
  } else if (endDate) {
    where.date = { [Op.lte]: endDate };
  }
  if (voucherType) {
    where.voucher_type = voucherType;
  }
  return where;
};

const LedgerService = {
  // Ledger Statement Module PDF spec — Basic Information, Opening Balance,
  // Transaction Details, Closing Balance, Report Filters, Export Options
  // and System Fields, all built around the existing Chart of Account /
  // JournalLine data (no schema changes needed).
  async getLedger(accountId, query = {}, requestingUserId = null) {
    const id = parseInt(accountId, 10);
    if (!Number.isInteger(id)) {
      const error = new Error('Invalid account id');
      error.status = 400;
      throw error;
    }

    const account = await Account.findByPk(id);
    if (!account) {
      const error = new Error('Account not found');
      error.status = 404;
      throw error;
    }

    const {
      startDate, endDate, voucherType, financialYear, currency,
      branch, department, accountType
    } = query;

    if (startDate && endDate && startDate > endDate) {
      const error = new Error('startDate cannot be later than endDate');
      error.status = 400;
      throw error;
    }

    // Report Filters — Account Type / Branch / Department narrow which
    // ledger this statement may be generated for (mirrors the Trial
    // Balance / Balance Sheet report filters on the same Account fields).
    if (accountType && String(account.type).toLowerCase() !== String(accountType).toLowerCase()) {
      const error = new Error(`Ledger "${account.name}" does not match account type filter "${accountType}"`);
      error.status = 400;
      throw error;
    }
    if (branch && String(account.branch || '').toLowerCase() !== String(branch).toLowerCase()) {
      const error = new Error(`Ledger "${account.name}" does not match branch filter "${branch}"`);
      error.status = 400;
      throw error;
    }
    if (department && String(account.department || '').toLowerCase() !== String(department).toLowerCase()) {
      const error = new Error(`Ledger "${account.name}" does not match department filter "${department}"`);
      error.status = 400;
      throw error;
    }

    const ledgerWhere = buildJournalWhere({ startDate, endDate, voucherType });

    const transactions = await JournalLine.findAll({
      where: { accountId: id },
      include: [{
        model: JournalEntry,
        attributes: ['date', 'description', 'voucher_number', 'voucher_type', 'reference_number'],
        ...(Object.keys(ledgerWhere).length ? { where: ledgerWhere, required: true } : {})
      }],
      order: [
        [JournalEntry, 'date', 'ASC'],
        [JournalEntry, 'id', 'ASC'],
        ['id', 'ASC']
      ]
    });

    let openingBalance = 0;
    if (startDate) {
      const openingTransactions = await JournalLine.findAll({
        where: { accountId: id },
        include: [{
          model: JournalEntry,
          attributes: ['date'],
          where: { date: { [Op.lt]: startDate } },
          required: true
        }]
      });
      openingBalance = sumLines(openingTransactions);
    }

    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;
    const formattedTransactions = transactions.map((line) => {
      const debit = toNumber(line.debit);
      const credit = toNumber(line.credit);
      totalDebit = toNumber(totalDebit + debit);
      totalCredit = toNumber(totalCredit + credit);
      runningBalance = toNumber(runningBalance + debit - credit);

      return {
        date: line.JournalEntry?.date,
        description: line.JournalEntry?.description || '',
        voucherNumber: line.JournalEntry?.voucher_number || '',
        voucherType: line.JournalEntry?.voucher_type || '',
        referenceNumber: line.JournalEntry?.reference_number || '',
        debit,
        credit,
        balance: runningBalance,
        runningBalance
      };
    });

    const resolvedOpeningBalance = toNumber(openingBalance);
    const resolvedClosingBalance = toNumber(runningBalance);

    // Basic Information — Statement ID is generated fresh per request since
    // the statement itself is computed on the fly, not persisted.
    const statementId = `LS-${Date.now()}`;

    const generatedByUser = requestingUserId
      ? await User.findByPk(requestingUserId, { attributes: ['name'] })
      : null;
    const generatedBy = generatedByUser?.name || null;
    const generatedAt = new Date().toISOString();

    const exportOptions = {
      exportPdf: `/api/ledger/${id}/export`,
      exportExcel: true,
      printStatement: true,
      emailStatement: `/api/ledger/${id}/email`
    };

    return {
      statementId,
      ledger: {
        ledgerId: account.id,
        ledgerName: account.name,
        ledgerCode: account.code || null,
        accountType: account.type
      },
      financialYear: financialYear || null,
      fromDate: startDate || null,
      toDate: endDate || null,
      currency: currency || account.currency || 'INR',

      openingBalance: resolvedOpeningBalance,
      openingDate: startDate || null,
      openingBalanceType: balanceTypeOf(resolvedOpeningBalance),

      transactions: formattedTransactions,

      totalDebit: toNumber(totalDebit),
      totalCredit: toNumber(totalCredit),
      closingBalance: resolvedClosingBalance,
      closingBalanceType: balanceTypeOf(resolvedClosingBalance),

      filters: {
        ledger: id,
        accountType: accountType || null,
        branch: branch || null,
        department: department || null,
        fromDate: startDate || null,
        toDate: endDate || null,
        voucherType: voucherType || null
      },
      exportOptions,

      generatedBy,
      generatedDate: generatedAt,
      lastUpdated: generatedAt,

      // Kept for backward compatibility with the account-select workflow.
      accountId: id
    };
  },

  // Resolves a Ledger master record to its linked Chart of Account and
  // returns the same statement shape as getLedger(), so the Ledger master
  // list can offer a "View Statement" action without duplicating logic.
  async getStatementByLedgerId(ledgerId, query = {}, requestingUserId = null) {
    const ledger = await Ledger.findByPk(ledgerId);
    if (!ledger) {
      const error = new Error('Ledger not found');
      error.status = 404;
      throw error;
    }
    if (!ledger.account_id) {
      const error = new Error('This ledger is not linked to a Chart of Account, so it has no transaction statement');
      error.status = 400;
      throw error;
    }
    const statement = await LedgerService.getLedger(ledger.account_id, query, requestingUserId);
    return { ...statement, ledgerId: ledger.id, ledgerName: ledger.ledger_name };
  }
};

module.exports = LedgerService;

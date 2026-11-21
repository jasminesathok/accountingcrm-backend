const JournalEntry = require('../models/journalEntryModel');
const JournalLine = require('../models/journalLineModel');
const Account = require('../models/accountModel');
const Client = require('../models/clientModel');
const Vendor = require('../models/vendorModel');
const AccountService = require('./accountService');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// Asset & Expense accounts increase on the debit side.
// Liability, Equity & Income accounts increase on the credit side.
const applyBalance = async (account, debit, credit, transaction) => {
  if (!account) return;
  const isDebitNormal = ['Asset', 'Expense'].includes(account.type);
  const adjustment = isDebitNormal ? (debit - credit) : (credit - debit);
  if (adjustment) {
    await account.increment('balance', { by: adjustment, transaction });
  }
};

// Basic information > Journal Number: auto-generated, unique, e.g. JE-000001
const generateJournalNumber = async (transaction) => {
  const last = await JournalEntry.findOne({
    where: { journal_number: { [Op.like]: 'JE-%' } },
    order: [['id', 'DESC']],
    transaction
  });
  let next = 1;
  if (last?.journal_number) {
    const match = String(last.journal_number).match(/(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return `JE-${String(next).padStart(6, '0')}`;
};

// Basic information > Posting Period: financial month/year, defaults from
// the entry date (e.g. "2026-08") when not supplied explicitly.
const derivePostingPeriod = (postingPeriod, date) => {
  if (postingPeriod) return postingPeriod;
  if (!date) return null;
  return String(date).slice(0, 7);
};

const INCLUDE_FULL = [
  { model: JournalLine, include: [Account] },
  { model: Client, attributes: ['id', 'first_name', 'last_name', 'company_name'] },
  { model: Vendor, attributes: ['id', 'name', 'company_name'] },
  { model: Account, as: 'TaxAccount', attributes: ['id', 'code', 'name'] }
];

// Pulls together the Basic Information + Party Information + Tax Details +
// Attachments + Approval Details + Notes + System Fields header payload
// used by both create() and update().
const pickHeaderFields = (data) => {
  const fields = [
    'date', 'journal_type', 'posting_period', 'status',
    'voucher_number', 'voucher_type', 'reference_number', 'description',
    'client_id', 'vendor_id', 'contact_person', 'invoice_bill_number', 'transaction_reference',
    'tax_type', 'tax_percentage', 'tax_amount', 'tax_account_id',
    'supporting_documents', 'invoice_attachment', 'receipt_attachment',
    'prepared_by', 'reviewed_by', 'approved_by', 'approval_status', 'approval_date',
    'internal_notes'
  ];
  const out = {};
  for (const f of fields) {
    if (data[f] !== undefined) out[f] = data[f] === '' ? null : data[f];
  }
  return out;
};

const JournalService = {
  async getAll({ page = 1, limit = 10, status, journal_type, search }) {
    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (journal_type) where.journal_type = journal_type;
    if (search) {
      where[Op.or] = [
        { journal_number: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { voucher_number: { [Op.like]: `%${search}%` } },
        { reference_number: { [Op.like]: `%${search}%` } }
      ];
    }
    const { rows, count } = await JournalEntry.findAndCountAll({
      where,
      include: INCLUDE_FULL,
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });
    return { rows, total: count };
  },

  async getOne(id) {
    const entry = await JournalEntry.findByPk(id, { include: INCLUDE_FULL });
    if (!entry) {
      const error = new Error('Journal entry not found');
      error.status = 404;
      throw error;
    }
    return entry;
  },

  // Used internally by other modules (Payments, Invoices, Bills, Expenses, ...)
  // to post double-entry lines. Does NOT touch Account.balance itself -
  // callers that also need running balances update them explicitly.
  async createJournalEntry(data, options = {}) {
    const { date, referenceId, description, voucher_number, voucher_type, reference_number, lines = [] } = data;
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new Error('Journal lines are required');
    }

    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error('Total debit must equal total credit');
    }

    const transaction = options.transaction || await sequelize.transaction();
    const managedTransaction = !options.transaction;

    try {
      const journal_number = await generateJournalNumber(transaction);
      const entry = await JournalEntry.create(
        {
          date, referenceId, description, voucher_number, voucher_type, reference_number,
          journal_number,
          posting_period: derivePostingPeriod(data.posting_period, date),
          journal_type: data.journal_type || 'General',
          status: data.status || 'Posted'
        },
        { transaction }
      );

      for (const line of lines) {
        await JournalLine.create(
          {
            journalEntryId: entry.id,
            accountId: line.accountId,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description || null
          },
          { transaction }
        );
      }

      if (managedTransaction) await transaction.commit();
      return entry;
    } catch (error) {
      if (managedTransaction) await transaction.rollback();
      throw error;
    }
  },

  // Used by the manual "Journal Entries" screen. Posts straight to
  // JournalLine (same table the Ledger / P&L / Balance Sheet read from)
  // and keeps Account.balance in sync using proper debit/credit sign rules.
  async create(data, actingUser) {
    const { items } = data;

    if (!Array.isArray(items) || items.length === 0) {
      const error = new Error('Journal items are required');
      error.status = 400;
      throw error;
    }

    const totalDebit = items.reduce((s, i) => s + (parseFloat(i.debit) || 0), 0);
    const totalCredit = items.reduce((s, i) => s + (parseFloat(i.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      const error = new Error('Debits must equal credits');
      error.status = 400;
      throw error;
    }

    const transaction = await sequelize.transaction();
    try {
      const header = pickHeaderFields(data);
      const status = header.status || 'Draft';
      const journal_number = await generateJournalNumber(transaction);

      const entry = await JournalEntry.create({
        ...header,
        journal_number,
        journal_type: header.journal_type || 'General',
        status,
        posting_period: derivePostingPeriod(header.posting_period, header.date),
        prepared_by: header.prepared_by || actingUser?.name || null,
        created_by: actingUser?.name || null,
        updated_by: actingUser?.name || null,
        posted_by: status === 'Posted' ? (actingUser?.name || null) : null,
        posted_date: status === 'Posted' ? new Date() : null
      }, { transaction });

      for (const item of items) {
        await JournalLine.create({
          journalEntryId: entry.id,
          accountId: item.account_id,
          debit: item.debit || 0,
          credit: item.credit || 0,
          description: item.description || null
        }, { transaction });

        const account = await Account.findByPk(item.account_id, { transaction });
        await applyBalance(account, parseFloat(item.debit) || 0, parseFloat(item.credit) || 0, transaction);
        // Chart of Accounts Module PDF > System Fields > Last Transaction Date
        await AccountService.touchLastTransactionDate(item.account_id, transaction);
      }

      await transaction.commit();
      return this.getOne(entry.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  // Edits header-level fields (Basic Information, Party Information, Tax
  // Details, Attachments, Approval Details, Notes) and status/approval
  // transitions. Does not touch account lines/balances - use delete +
  // create for line-level corrections, matching how Posted entries should
  // be corrected via reversal rather than in-place edits.
  async update(id, data, actingUser) {
    const entry = await JournalEntry.findByPk(id);
    if (!entry) {
      const error = new Error('Journal entry not found');
      error.status = 404;
      throw error;
    }

    const header = pickHeaderFields(data);
    if (header.posting_period === undefined && header.date) {
      header.posting_period = derivePostingPeriod(null, header.date);
    }
    header.updated_by = actingUser?.name || entry.updated_by;

    // Status -> Posted sets posted_by/posted_date once.
    if (header.status === 'Posted' && entry.status !== 'Posted') {
      header.posted_by = actingUser?.name || null;
      header.posted_date = new Date();
    }
    // Approval status -> Approved/Rejected stamps the approval date.
    if (header.approval_status && header.approval_status !== entry.approval_status) {
      header.approval_date = new Date();
      header.approved_by = header.approved_by || actingUser?.name || entry.approved_by;
    }

    await entry.update(header);
    return this.getOne(id);
  },

  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      const entry = await JournalEntry.findByPk(id, {
        include: [{ model: JournalLine, include: [Account] }],
        transaction
      });
      if (!entry) {
        const error = new Error('Journal entry not found');
        error.status = 404;
        throw error;
      }

      // Reverse the balance impact of this entry's lines before removing them.
      for (const line of entry.JournalLines || []) {
        await applyBalance(
          line.Account,
          -(parseFloat(line.debit) || 0),
          -(parseFloat(line.credit) || 0),
          transaction
        );
      }

      await JournalLine.destroy({ where: { journalEntryId: id }, transaction });
      await entry.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

module.exports = JournalService;

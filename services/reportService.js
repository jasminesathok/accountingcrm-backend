const { Op } = require('sequelize');
const Account = require('../models/accountModel');
const JournalLine = require('../models/journalLineModel');
const JournalEntry = require('../models/journalEntryModel');
const Invoice = require('../models/invoiceModel');
const Payment = require('../models/paymentModel');
const Client = require('../models/clientModel');
const Bill = require('../models/billModel');
const Vendor = require('../models/vendorModel');
const User = require('../models/userModel');

const toNumber = (value) => Number(parseFloat(value || 0).toFixed(2));

const normalizeType = (type) => String(type || '').toLowerCase();

const buildDateWhere = ({ startDate, endDate }) => {
  const where = {};
  if (startDate && endDate) {
    where.date = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.date = { [Op.gte]: startDate };
  } else if (endDate) {
    where.date = { [Op.lte]: endDate };
  }
  return where;
};

const buildDueDateWhere = ({ startDate, endDate }) => {
  const where = {};
  if (startDate && endDate) {
    where.due_date = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.due_date = { [Op.gte]: startDate };
  } else if (endDate) {
    where.due_date = { [Op.lte]: endDate };
  }
  return where;
};

const buildBillDueDateWhere = ({ startDate, endDate }) => buildDueDateWhere({ startDate, endDate });

// A/P Aging Module PDF > Report Filters > Date Range: "Filter by bill
// dates" — distinct from buildBillDueDateWhere above, which filters on
// due_date (used to drive the aging buckets, not this report filter).
const buildBillDateWhere = ({ startDate, endDate }) => {
  const where = {};
  if (startDate && endDate) {
    where.bill_date = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.bill_date = { [Op.gte]: startDate };
  } else if (endDate) {
    where.bill_date = { [Op.lte]: endDate };
  }
  return where;
};

const INCOME_FIELDS = ['Sales Revenue', 'Service Revenue', 'Other Income', 'Interest Income'];
const COGS_STOCK_FIELDS = ['Opening Stock', 'Purchases', 'Purchase Returns', 'Closing Stock'];
const OPEX_FIELDS = ['Salary Expense', 'Rent Expense', 'Utility Expense', 'Travel Expense', 'Marketing Expense', 'Office Expense', 'Depreciation', 'Other Expenses'];
const camelize = (label) => label.replace(/\s+([a-zA-Z])/g, (_, c) => c.toUpperCase()).replace(/^([A-Z])/, (c) => c.toLowerCase());

const ReportService = {
  // Profit & Loss Module — Basic Information / Income Details / Cost of
  // Goods Sold / Operating Expenses / Profit Calculation / Comparison
  // Details / Report Filters / Export Options / System Fields, per the PDF
  // spec. Computed on demand like the other reports (Balance Sheet, AR/AP
  // Aging, Trial Balance) rather than persisted.
  //
  // Category buckets: each Income/Expense JournalLine's account is placed
  // into the PDF field matching its `account_category` (e.g. "Sales
  // Revenue", "Rent Expense" — the same free-text field the Chart of
  // Accounts module already uses, filterable via GET /accounts). Accounts
  // left uncategorized (or tagged something else) fall back to "Other
  // Income" / "Other Expenses" so nothing silently drops out of the
  // totals. The four COGS line items (Opening Stock, Purchases, Purchase
  // Returns, Closing Stock) combine via the standard formula; an account
  // categorized directly as "Cost of Goods Sold" / "COGS" (as seeded) is
  // added on top as a direct cost, for CRMs that don't track stock
  // movements as separate accounts.
  //
  // Note on "Project" in Report Filters: this codebase has no Project
  // entity to filter by (the same situation Branch/Department were in
  // before those fields were added to Account for the Trial Balance
  // module), so the param is accepted and echoed back under `filters` for
  // the UI, but doesn't narrow the result set.
  async getProfitLoss(query = {}, requestingUserId = null) {
    const {
      financialYear, reportPeriod, currency, reportStatus,
      branch, department, project, client, category,
      taxRate, approvedBy, approvedDate
    } = query;
    // Accept both the spec's From Date/To Date and the legacy
    // startDate/endDate query names (still used by older callers).
    const fromDate = query.fromDate || query.startDate;
    const toDate = query.toDate || query.endDate;

    if (fromDate && toDate && fromDate > toDate) {
      const error = new Error('fromDate cannot be later than toDate');
      error.status = 400;
      throw error;
    }

    const ALLOWED_STATUSES = ['Draft', 'Generated', 'Finalized'];
    const resolvedReportStatus = ALLOWED_STATUSES.includes(reportStatus) ? reportStatus : 'Generated';
    const reportId = `PL-${Date.now()}`;

    const accountWhere = {};
    if (branch) accountWhere.branch = branch;
    if (department) accountWhere.department = department;
    if (category) accountWhere.account_category = category;

    const computeForRange = (rangeFromDate, rangeToDate) =>
      ReportService._computeProfitLossRange({ fromDate: rangeFromDate, toDate: rangeToDate, accountWhere, client, taxRate });

    const current = await computeForRange(fromDate, toDate);

    // Comparison Details — a same-length window immediately preceding the
    // current range. Only computed when both bounds of the current range
    // are known, since "same length" is undefined otherwise.
    let comparison = {
      previousPeriodProfit: null,
      currentPeriodProfit: current.netProfitAfterTax,
      profitGrowthPercent: null,
      varianceAmount: null
    };

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const rangeDays = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1);
      const prevTo = new Date(from);
      prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - (rangeDays - 1));
      const toISODate = (d) => d.toISOString().slice(0, 10);

      const previous = await computeForRange(toISODate(prevFrom), toISODate(prevTo));
      const previousPeriodProfit = previous.netProfitAfterTax;
      const currentPeriodProfit = current.netProfitAfterTax;
      const varianceAmount = toNumber(currentPeriodProfit - previousPeriodProfit);
      const profitGrowthPercent = previousPeriodProfit !== 0
        ? toNumber((varianceAmount / Math.abs(previousPeriodProfit)) * 100)
        : null;

      comparison = { previousPeriodProfit, currentPeriodProfit, profitGrowthPercent, varianceAmount };
    }

    const generatedByUser = requestingUserId ? await User.findByPk(requestingUserId, { attributes: ['name'] }) : null;
    const generatedBy = generatedByUser?.name || null;
    const generatedAt = new Date().toISOString();

    // Export Options — this report is computed fresh on every request
    // rather than saved, so there's no separate "Last Updated" timestamp
    // to track; it mirrors Generated Date for that reason (same approach
    // as the Trial Balance module).
    const exportOptions = {
      exportPdf: '/api/reports/profit-loss/export?format=pdf',
      exportExcel: '/api/reports/profit-loss/export?format=excel',
      printReport: true,
      emailReport: '/api/reports/profit-loss/email'
    };

    return {
      report: {
        reportId,
        reportName: 'Profit & Loss Report',
        reportPeriod: reportPeriod || null,
        financialYear: financialYear || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        currency: currency || 'INR',
        reportStatus: resolvedReportStatus
      },
      income: current.income,
      cogs: current.cogs,
      operatingExpenses: current.operatingExpenses,
      profit: current.profit,
      comparison,
      filters: {
        branch: branch || null,
        department: department || null,
        project: project || null,
        client: client || null,
        category: category || null,
        fromDate: fromDate || null,
        toDate: toDate || null
      },
      exportOptions,
      generatedBy,
      generatedDate: generatedAt,
      approvedBy: approvedBy || null,
      approvedDate: approvedDate || null,
      lastUpdated: generatedAt
    };
  },

  // Internal helper: aggregates Income/Expense journal lines for one date
  // range into the Income Details / COGS / Operating Expenses / Profit
  // Calculation shape. Shared by the current-period and previous-period
  // (Comparison Details) calculations in getProfitLoss above.
  async _computeProfitLossRange({ fromDate, toDate, accountWhere = {}, client, taxRate }) {
    const journalWhere = buildDateWhere({ startDate: fromDate, endDate: toDate });
    const hasDateFilter = Object.keys(journalWhere).length > 0;

    const journalEntryInclude = {
      model: JournalEntry,
      attributes: [],
      where: hasDateFilter ? { ...journalWhere } : {},
      required: hasDateFilter
    };

    if (client) {
      const isNumericClientId = /^\d+$/.test(String(client).trim());
      if (isNumericClientId) {
        journalEntryInclude.where.client_id = client;
      } else {
        journalEntryInclude.include = [{
          model: Client,
          attributes: [],
          where: {
            [Op.or]: [
              { first_name: { [Op.like]: `%${client}%` } },
              { last_name: { [Op.like]: `%${client}%` } },
              { company_name: { [Op.like]: `%${client}%` } }
            ]
          },
          required: true
        }];
      }
      journalEntryInclude.required = true;
    }

    const lines = await JournalLine.findAll({
      attributes: ['accountId', 'debit', 'credit'],
      include: [
        {
          model: Account,
          attributes: ['id', 'name', 'type', 'account_category'],
          where: { ...accountWhere, type: { [Op.in]: ['Income', 'Expense'] } },
          required: true
        },
        journalEntryInclude
      ]
    });

    const incomeTotals = Object.fromEntries(INCOME_FIELDS.map((f) => [f, 0]));
    const cogsStockTotals = Object.fromEntries(COGS_STOCK_FIELDS.map((f) => [f, 0]));
    let directCogs = 0;
    const opexTotals = Object.fromEntries(OPEX_FIELDS.map((f) => [f, 0]));

    for (const line of lines) {
      const account = line.Account;
      const debit = toNumber(line.debit);
      const credit = toNumber(line.credit);
      const normalized = String(account.account_category || '').trim().toLowerCase();

      if (account.type === 'Income') {
        const amount = toNumber(credit - debit);
        const match = INCOME_FIELDS.find((f) => f.toLowerCase() === normalized);
        const key = match || 'Other Income';
        incomeTotals[key] = toNumber(incomeTotals[key] + amount);
      } else {
        const amount = toNumber(debit - credit);
        const stockMatch = COGS_STOCK_FIELDS.find((f) => f.toLowerCase() === normalized);
        if (stockMatch) {
          cogsStockTotals[stockMatch] = toNumber(cogsStockTotals[stockMatch] + amount);
        } else if (normalized === 'cost of goods sold' || normalized === 'cogs') {
          directCogs = toNumber(directCogs + amount);
        } else {
          const opexMatch = OPEX_FIELDS.find((f) => f.toLowerCase() === normalized);
          const key = opexMatch || 'Other Expenses';
          opexTotals[key] = toNumber(opexTotals[key] + amount);
        }
      }
    }

    const totalIncome = toNumber(INCOME_FIELDS.reduce((sum, f) => sum + incomeTotals[f], 0));
    const costOfGoodsSold = toNumber(
      cogsStockTotals['Opening Stock'] + cogsStockTotals['Purchases']
      - cogsStockTotals['Purchase Returns'] - cogsStockTotals['Closing Stock']
      + directCogs
    );
    const totalOperatingExpenses = toNumber(OPEX_FIELDS.reduce((sum, f) => sum + opexTotals[f], 0));

    const grossProfit = toNumber(totalIncome - costOfGoodsSold);
    const operatingProfit = toNumber(grossProfit - totalOperatingExpenses);
    const netProfitBeforeTax = operatingProfit;
    const parsedTaxRate = taxRate !== undefined && taxRate !== null && taxRate !== '' ? Number(taxRate) : null;
    const taxExpense = parsedTaxRate && netProfitBeforeTax > 0
      ? toNumber(netProfitBeforeTax * (parsedTaxRate / 100))
      : 0;
    const netProfitAfterTax = toNumber(netProfitBeforeTax - taxExpense);
    const netLoss = netProfitAfterTax < 0 ? toNumber(-netProfitAfterTax) : 0;

    const income = { totalIncome };
    INCOME_FIELDS.forEach((f) => { income[camelize(f)] = incomeTotals[f]; });

    const cogs = {
      openingStock: cogsStockTotals['Opening Stock'],
      purchases: cogsStockTotals['Purchases'],
      purchaseReturns: cogsStockTotals['Purchase Returns'],
      closingStock: cogsStockTotals['Closing Stock'],
      directCostOfGoodsSold: directCogs,
      costOfGoodsSold
    };

    const operatingExpenses = { totalOperatingExpenses };
    OPEX_FIELDS.forEach((f) => { operatingExpenses[camelize(f)] = opexTotals[f]; });

    return {
      income,
      cogs,
      operatingExpenses,
      profit: {
        grossProfit,
        operatingProfit,
        netProfitBeforeTax,
        taxExpense,
        netProfitAfterTax,
        netLoss
      },
      netProfitAfterTax
    };
  },

  // Balance Sheet Module — Basic Information / Assets / Liabilities /
  // Equity / Balance Summary / Report Filters / Export Options / System
  // Fields, per the PDF spec. Computed on demand like the other reports
  // (P&L, AR/AP Aging, Trial Balance) rather than persisted.
  //
  // Category buckets: each Asset/Liability/Equity JournalLine's account is
  // placed into the PDF field matching its `account_category` (the same
  // free-text field the Chart of Accounts module already uses). Accounts
  // left uncategorized fall back to "Other Assets" / "Other Liabilities" so
  // nothing silently drops out of the totals; uncategorized Equity accounts
  // fall back into "Retained Earnings" (the conventional plug account for
  // equity that isn't Owner's Capital or Drawings).
  //
  // "As On Date": a real balance sheet is cumulative from inception, not a
  // bounded range, so every Asset/Liability/Equity balance here is summed
  // over all journal lines dated on or before asOnDate. Report Filters >
  // Date Range narrows the lower bound too, for callers that explicitly
  // want a windowed balance instead of the full cumulative one.
  //
  // Note on "Project" in Report Filters: this codebase has no Project
  // entity to filter by (the same situation Branch/Department were in
  // before those fields were added to Account for the Trial Balance
  // module), so the param is accepted and echoed back under `filters` for
  // the UI, but doesn't narrow the result set.
  async getBalanceSheet(query = {}, requestingUserId = null) {
    const {
      financialYear, reportPeriod, currency, reportStatus,
      branch, department, project, approvedBy, approvedDate
    } = query;
    const asOnDate = query.asOnDate || query.endDate || new Date().toISOString().slice(0, 10);
    const fromDate = query.fromDate || query.startDate || null;

    if (fromDate && asOnDate && fromDate > asOnDate) {
      const error = new Error('fromDate cannot be later than asOnDate');
      error.status = 400;
      throw error;
    }

    const ALLOWED_STATUSES = ['Draft', 'Generated', 'Finalized'];
    const resolvedReportStatus = ALLOWED_STATUSES.includes(reportStatus) ? reportStatus : 'Generated';
    const reportId = `BS-${Date.now()}`;

    const accountWhere = { type: { [Op.in]: ['Asset', 'Liability', 'Equity', 'asset', 'liability', 'equity'] } };
    if (branch) accountWhere.branch = branch;
    if (department) accountWhere.department = department;

    const journalWhere = buildDateWhere({ startDate: fromDate, endDate: asOnDate });

    const lines = await JournalLine.findAll({
      attributes: ['accountId', 'debit', 'credit'],
      include: [
        {
          model: Account,
          attributes: ['id', 'name', 'type', 'account_category'],
          where: accountWhere,
          required: true
        },
        {
          model: JournalEntry,
          attributes: [],
          ...(Object.keys(journalWhere).length ? { where: journalWhere, required: true } : {})
        }
      ]
    });

    const CURRENT_ASSET_FIELDS = ['Cash in Hand', 'Bank Balance', 'Accounts Receivable', 'Inventory', 'Prepaid Expenses', 'Other Assets'];
    const NON_CURRENT_ASSET_FIELDS = ['Fixed Assets', 'Investments'];
    const CURRENT_LIABILITY_FIELDS = ['Accounts Payable', 'Short-Term Loans', 'Taxes Payable', 'Accrued Expenses', 'Other Liabilities'];
    const NON_CURRENT_LIABILITY_FIELDS = ['Long-Term Loans'];
    const EQUITY_FIELDS = ["Owner's Capital", 'Retained Earnings', 'Drawings'];

    const currentAssetTotals = Object.fromEntries(CURRENT_ASSET_FIELDS.map((f) => [f, 0]));
    const nonCurrentAssetTotals = Object.fromEntries(NON_CURRENT_ASSET_FIELDS.map((f) => [f, 0]));
    const currentLiabilityTotals = Object.fromEntries(CURRENT_LIABILITY_FIELDS.map((f) => [f, 0]));
    const nonCurrentLiabilityTotals = Object.fromEntries(NON_CURRENT_LIABILITY_FIELDS.map((f) => [f, 0]));
    const equityTotals = Object.fromEntries(EQUITY_FIELDS.map((f) => [f, 0]));

    for (const line of lines) {
      const account = line.Account;
      const debit = toNumber(line.debit);
      const credit = toNumber(line.credit);
      const type = normalizeType(account.type);
      const normalized = String(account.account_category || '').trim().toLowerCase();

      if (type === 'asset') {
        const amount = toNumber(debit - credit);
        const currentMatch = CURRENT_ASSET_FIELDS.find((f) => f.toLowerCase() === normalized);
        const nonCurrentMatch = NON_CURRENT_ASSET_FIELDS.find((f) => f.toLowerCase() === normalized);
        if (nonCurrentMatch) {
          nonCurrentAssetTotals[nonCurrentMatch] = toNumber(nonCurrentAssetTotals[nonCurrentMatch] + amount);
        } else {
          const key = currentMatch || 'Other Assets';
          currentAssetTotals[key] = toNumber(currentAssetTotals[key] + amount);
        }
      } else if (type === 'liability') {
        const amount = toNumber(credit - debit);
        const currentMatch = CURRENT_LIABILITY_FIELDS.find((f) => f.toLowerCase() === normalized);
        const nonCurrentMatch = NON_CURRENT_LIABILITY_FIELDS.find((f) => f.toLowerCase() === normalized);
        if (nonCurrentMatch) {
          nonCurrentLiabilityTotals[nonCurrentMatch] = toNumber(nonCurrentLiabilityTotals[nonCurrentMatch] + amount);
        } else {
          const key = currentMatch || 'Other Liabilities';
          currentLiabilityTotals[key] = toNumber(currentLiabilityTotals[key] + amount);
        }
      } else {
        // Equity — normal credit balance; a Drawings account posted with
        // debits will naturally net negative here, reducing total equity.
        const amount = toNumber(credit - debit);
        const match = EQUITY_FIELDS.find((f) => f.toLowerCase() === normalized);
        const key = match || 'Retained Earnings';
        equityTotals[key] = toNumber(equityTotals[key] + amount);
      }
    }

    // Equity > Current Year Profit/Loss: computed via the same P&L logic as
    // the Profit & Loss report, for the same window used above.
    const plRange = await ReportService._computeProfitLossRange({ fromDate, toDate: asOnDate, accountWhere: {} });
    const currentYearProfitLoss = plRange.netProfitAfterTax;

    const totalCurrentAssets = toNumber(CURRENT_ASSET_FIELDS.reduce((sum, f) => sum + currentAssetTotals[f], 0));
    const totalNonCurrentAssets = toNumber(NON_CURRENT_ASSET_FIELDS.reduce((sum, f) => sum + nonCurrentAssetTotals[f], 0));
    const totalAssets = toNumber(totalCurrentAssets + totalNonCurrentAssets);

    const totalCurrentLiabilities = toNumber(CURRENT_LIABILITY_FIELDS.reduce((sum, f) => sum + currentLiabilityTotals[f], 0));
    const totalNonCurrentLiabilities = toNumber(NON_CURRENT_LIABILITY_FIELDS.reduce((sum, f) => sum + nonCurrentLiabilityTotals[f], 0));
    const totalLiabilities = toNumber(totalCurrentLiabilities + totalNonCurrentLiabilities);

    const totalEquity = toNumber(EQUITY_FIELDS.reduce((sum, f) => sum + equityTotals[f], 0) + currentYearProfitLoss);
    const totalLiabilitiesAndEquity = toNumber(totalLiabilities + totalEquity);
    const difference = toNumber(totalAssets - totalLiabilitiesAndEquity);

    const assets = {
      cashInHand: currentAssetTotals['Cash in Hand'],
      bankBalance: currentAssetTotals['Bank Balance'],
      accountsReceivable: currentAssetTotals['Accounts Receivable'],
      inventory: currentAssetTotals['Inventory'],
      prepaidExpenses: currentAssetTotals['Prepaid Expenses'],
      otherAssets: currentAssetTotals['Other Assets'],
      fixedAssets: nonCurrentAssetTotals['Fixed Assets'],
      investments: nonCurrentAssetTotals['Investments'],
      totalCurrentAssets,
      totalNonCurrentAssets,
      totalAssets
    };

    const liabilities = {
      accountsPayable: currentLiabilityTotals['Accounts Payable'],
      shortTermLoans: currentLiabilityTotals['Short-Term Loans'],
      longTermLoans: nonCurrentLiabilityTotals['Long-Term Loans'],
      taxesPayable: currentLiabilityTotals['Taxes Payable'],
      accruedExpenses: currentLiabilityTotals['Accrued Expenses'],
      otherLiabilities: currentLiabilityTotals['Other Liabilities'],
      totalCurrentLiabilities,
      totalNonCurrentLiabilities,
      totalLiabilities
    };

    const equity = {
      ownersCapital: equityTotals["Owner's Capital"],
      retainedEarnings: equityTotals['Retained Earnings'],
      currentYearProfitLoss,
      drawings: equityTotals['Drawings'],
      totalEquity
    };

    const balanceSummary = {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity,
      balanceStatus: Math.abs(difference) < 0.01 ? 'Balanced' : 'Not Balanced'
    };

    const exportOptions = {
      exportPdf: '/api/reports/balance-sheet/export?format=pdf',
      exportExcel: '/api/reports/balance-sheet/export?format=excel',
      printReport: true,
      emailReport: '/api/reports/balance-sheet/email'
    };

    const generatedByUser = requestingUserId ? await User.findByPk(requestingUserId, { attributes: ['name'] }) : null;
    const generatedBy = generatedByUser?.name || null;
    const generatedAt = new Date().toISOString();

    return {
      report: {
        reportId,
        reportName: 'Balance Sheet',
        financialYear: financialYear || null,
        reportPeriod: reportPeriod || null,
        asOnDate,
        currency: currency || 'INR',
        reportStatus: resolvedReportStatus
      },
      assets,
      liabilities,
      equity,
      balanceSummary,
      filters: {
        branch: branch || null,
        department: department || null,
        project: project || null,
        fromDate: fromDate || null,
        toDate: asOnDate || null
      },
      exportOptions,
      generatedBy,
      generatedDate: generatedAt,
      approvedBy: approvedBy || null,
      approvedDate: approvedDate || null,
      lastUpdated: generatedAt
    };
  },

  // A/R Aging Module — Basic Information / Customer Information / Invoice
  // Details / Aging Buckets / Summary / Report Filters / Export Options /
  // System Fields, per the PDF spec. Computed on demand like the other
  // reports (Balance Sheet, Trial Balance, P&L) rather than persisted.
  //
  // Note on "Sales Representative" and "Branch" in Report Filters:
  // Sales Representative maps to Client.sales_representative (free text,
  // same field the Clients module already uses). Branch maps to the new
  // Invoice.branch column (same pattern as Account.branch for Trial
  // Balance — this codebase has no separate Branch entity).
  async getARAging(query = {}, requestingUserId = null) {
    const {
      clientId, client, salesRepresentative, branch, invoiceStatus,
      currency, reportStatus
    } = query;
    const fromDate = query.fromDate || query.startDate;
    const toDate = query.toDate || query.endDate;
    const asOnDate = query.asOnDate || new Date().toISOString().slice(0, 10);

    if (fromDate && toDate && fromDate > toDate) {
      const error = new Error('fromDate cannot be later than toDate');
      error.status = 400;
      throw error;
    }

    const ALLOWED_STATUSES = ['Draft', 'Generated', 'Finalized'];
    const resolvedReportStatus = ALLOWED_STATUSES.includes(reportStatus) ? reportStatus : 'Generated';
    const reportId = `AR-${Date.now()}`;

    // Report Filters > Date Range: "Filter by invoice dates" per the spec,
    // so this narrows on invoice_date (due_date still drives aging below).
    const invoiceWhere = buildDateWhere({ startDate: fromDate, endDate: toDate });

    const clientSearchTerm = client || clientId;
    const isNumericClientId = clientSearchTerm && /^\d+$/.test(String(clientSearchTerm).trim());
    if (isNumericClientId) {
      invoiceWhere.client_id = clientSearchTerm;
    }
    if (branch) invoiceWhere.branch = branch;

    // Report Filters > Invoice Status: Paid / Partial / Unpaid / Overdue
    if (invoiceStatus) {
      const normalizedStatus = String(invoiceStatus).trim().toLowerCase();
      if (normalizedStatus === 'overdue') {
        invoiceWhere.status = 'overdue';
      } else if (['paid', 'partial', 'unpaid'].includes(normalizedStatus)) {
        invoiceWhere.payment_status = normalizedStatus;
      }
    }

    const clientInclude = {
      model: Client,
      attributes: ['id', 'client_code', 'first_name', 'last_name', 'company_name', 'contact_person', 'phone', 'email', 'sales_representative']
    };
    const clientOr = [];
    if (clientSearchTerm && !isNumericClientId) {
      const search = String(clientSearchTerm).trim();
      clientOr.push(
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { company_name: { [Op.like]: `%${search}%` } }
      );
    }
    if (salesRepresentative) {
      clientInclude.where = {
        ...(clientInclude.where || {}),
        sales_representative: { [Op.like]: `%${salesRepresentative}%` }
      };
    }
    if (clientOr.length) {
      clientInclude.where = { ...(clientInclude.where || {}), [Op.or]: clientOr };
    }
    if (clientInclude.where) clientInclude.required = true;

    const invoices = await Invoice.findAll({
      where: invoiceWhere,
      include: [
        clientInclude,
        { model: Payment, attributes: ['amount'] }
      ],
      order: [['due_date', 'ASC'], ['id', 'ASC']]
    });

    // Aging Buckets per the PDF spec.
    const summary = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '91-120': 0,
      'above120': 0
    };

    const details = [];
    const asOnDateAtMidnight = new Date(asOnDate);
    asOnDateAtMidnight.setHours(0, 0, 0, 0);
    const clientsWithOutstanding = new Set();

    // Summary > Average Collection Days: mean days between invoice date and
    // paid date, across invoices that have actually been paid in full.
    let collectionDaysTotal = 0;
    let collectionDaysCount = 0;

    for (const invoice of invoices) {
      const totalAmount = toNumber(invoice.total_amount);
      const paidAmount = toNumber((invoice.Payments || []).reduce((sum, payment) => sum + toNumber(payment.amount), 0));
      const outstandingAmount = toNumber(totalAmount - paidAmount);

      if (invoice.status === 'paid' || invoice.payment_status === 'paid') {
        if (invoice.invoice_date && invoice.paid_date) {
          const days = Math.round((new Date(invoice.paid_date) - new Date(invoice.invoice_date)) / (1000 * 60 * 60 * 24));
          if (Number.isFinite(days) && days >= 0) {
            collectionDaysTotal += days;
            collectionDaysCount += 1;
          }
        }
      }

      if (outstandingAmount <= 0) continue;

      const client = invoice.Client;
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
      if (dueDate) dueDate.setHours(0, 0, 0, 0);

      const daysOverdue = dueDate
        ? Math.floor((asOnDateAtMidnight - dueDate) / (1000 * 60 * 60 * 24))
        : 0;

      const bucket = daysOverdue <= 0
        ? 'current'
        : daysOverdue <= 30
          ? '1-30'
          : daysOverdue <= 60
            ? '31-60'
            : daysOverdue <= 90
              ? '61-90'
              : daysOverdue <= 120
                ? '91-120'
                : 'above120';

      summary[bucket] = toNumber(summary[bucket] + outstandingAmount);
      if (client) clientsWithOutstanding.add(client.id);

      details.push({
        // Customer Information
        clientId: client?.id ?? invoice.client_id,
        clientCode: client?.client_code || null,
        clientName: [client?.first_name, client?.last_name].filter(Boolean).join(' ')
          || client?.company_name
          || 'Unknown Client',
        contactPerson: client?.contact_person || null,
        mobileNumber: client?.phone || null,
        emailAddress: client?.email || null,
        // Invoice Details
        invoiceNumber: invoice.invoice_number || `INV-${invoice.id}`,
        invoiceId: invoice.id,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        invoiceAmount: totalAmount,
        amountPaid: paidAmount,
        outstandingAmount,
        // Aging
        daysOverdue: Math.max(0, daysOverdue),
        bucket: bucket === 'above120' ? 'Above 120 Days' : bucket === 'current' ? 'Current' : `${bucket} Days`
      });
    }

    const totalOutstanding = toNumber(details.reduce((sum, row) => sum + row.outstandingAmount, 0));
    const totalOverdue = toNumber(totalOutstanding - summary.current);
    const averageCollectionDays = collectionDaysCount > 0
      ? toNumber(collectionDaysTotal / collectionDaysCount)
      : null;

    const exportOptions = {
      exportPdf: '/api/reports/ar-aging/export?format=pdf',
      exportExcel: '/api/reports/ar-aging/export?format=excel',
      printReport: true,
      emailReport: '/api/reports/ar-aging/email'
    };

    const generatedByUser = requestingUserId ? await User.findByPk(requestingUserId, { attributes: ['name'] }) : null;
    const generatedBy = generatedByUser?.name || null;
    const generatedAt = new Date().toISOString();

    return {
      report: {
        reportId,
        reportName: 'Accounts Receivable Aging',
        reportDate: generatedAt,
        asOnDate,
        currency: currency || 'INR',
        reportStatus: resolvedReportStatus
      },
      summary: {
        ...summary,
        totalOutstanding,
        totalOverdue,
        totalCustomers: clientsWithOutstanding.size,
        averageCollectionDays
      },
      details,
      filters: {
        client: clientSearchTerm || null,
        salesRepresentative: salesRepresentative || null,
        branch: branch || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        invoiceStatus: invoiceStatus || null
      },
      exportOptions,
      generatedBy,
      generatedDate: generatedAt,
      lastUpdated: generatedAt
    };
  },

  // Accounts Payable (A/P) Aging Module — Basic Information / Vendor
  // Information / Bill Details / Aging Buckets / Summary / Report Filters /
  // Export Options / System Fields, per the PDF spec. Computed on demand
  // like the other reports (P&L, Balance Sheet, AR Aging, Trial Balance)
  // rather than persisted, mirroring getARAging's structure and field names
  // one-for-one on the payable side.
  async getAPAging(query = {}, requestingUserId = null) {
    const {
      vendorId, vendor, branch, department, billStatus,
      currency, reportStatus
    } = query;
    const fromDate = query.fromDate || query.startDate;
    const toDate = query.toDate || query.endDate;
    const asOnDate = query.asOnDate || new Date().toISOString().slice(0, 10);

    if (fromDate && toDate && fromDate > toDate) {
      const error = new Error('fromDate cannot be later than toDate');
      error.status = 400;
      throw error;
    }

    const ALLOWED_STATUSES = ['Draft', 'Generated', 'Finalized'];
    const resolvedReportStatus = ALLOWED_STATUSES.includes(reportStatus) ? reportStatus : 'Generated';
    const reportId = `AP-${Date.now()}`;

    // Report Filters > Date Range: "Filter by bill dates", so this narrows
    // on bill_date (due_date still drives aging below).
    const billWhere = buildBillDateWhere({ startDate: fromDate, endDate: toDate });

    const vendorSearchTerm = vendor || vendorId;
    const isNumericVendorId = vendorSearchTerm && /^\d+$/.test(String(vendorSearchTerm).trim());
    if (isNumericVendorId) {
      billWhere.vendor_id = vendorSearchTerm;
    }
    if (branch) billWhere.branch = branch;
    if (department) billWhere.department = department;

    // Report Filters > Bill Status: Paid / Partial / Unpaid / Overdue
    if (billStatus) {
      const normalizedStatus = String(billStatus).trim().toLowerCase();
      if (normalizedStatus === 'overdue') {
        billWhere.status = 'overdue';
      } else if (['paid', 'partial', 'unpaid'].includes(normalizedStatus)) {
        billWhere.payment_status = normalizedStatus;
      }
    }

    const vendorInclude = {
      model: Vendor,
      attributes: ['id', 'vendor_code', 'name', 'company_name', 'contact_person', 'phone', 'email']
    };
    if (vendorSearchTerm && !isNumericVendorId) {
      const search = String(vendorSearchTerm).trim();
      vendorInclude.where = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { company_name: { [Op.like]: `%${search}%` } },
          { vendor_code: { [Op.like]: `%${search}%` } }
        ]
      };
      vendorInclude.required = true;
    }

    const bills = await Bill.findAll({
      where: billWhere,
      include: [
        vendorInclude,
        { model: Payment, attributes: ['amount'] }
      ],
      order: [['due_date', 'ASC'], ['id', 'ASC']]
    });

    // Aging Buckets per the PDF spec.
    const summary = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '91-120': 0,
      'above120': 0
    };

    const details = [];
    const asOnDateAtMidnight = new Date(asOnDate);
    asOnDateAtMidnight.setHours(0, 0, 0, 0);
    const vendorsWithOutstanding = new Set();

    // Summary > Average Payment Days: mean days between bill date and last
    // payment date, across bills that have actually been paid in full.
    let paymentDaysTotal = 0;
    let paymentDaysCount = 0;

    for (const bill of bills) {
      const billAmount = toNumber(bill.amount);
      const paidAmount = toNumber((bill.Payments || []).reduce((sum, payment) => sum + toNumber(payment.amount), 0));
      const outstandingAmount = toNumber(billAmount - paidAmount);

      if (bill.status === 'paid' || bill.payment_status === 'paid') {
        if (bill.bill_date && bill.last_payment_date) {
          const days = Math.round((new Date(bill.last_payment_date) - new Date(bill.bill_date)) / (1000 * 60 * 60 * 24));
          if (Number.isFinite(days) && days >= 0) {
            paymentDaysTotal += days;
            paymentDaysCount += 1;
          }
        }
      }

      if (outstandingAmount <= 0) continue;

      const vendorRow = bill.Vendor;
      const dueDate = bill.due_date ? new Date(bill.due_date) : null;
      if (dueDate) dueDate.setHours(0, 0, 0, 0);

      const daysOverdue = dueDate
        ? Math.floor((asOnDateAtMidnight - dueDate) / (1000 * 60 * 60 * 24))
        : 0;

      const bucket = daysOverdue <= 0
        ? 'current'
        : daysOverdue <= 30
          ? '1-30'
          : daysOverdue <= 60
            ? '31-60'
            : daysOverdue <= 90
              ? '61-90'
              : daysOverdue <= 120
                ? '91-120'
                : 'above120';

      summary[bucket] = toNumber(summary[bucket] + outstandingAmount);
      if (vendorRow) vendorsWithOutstanding.add(vendorRow.id);

      details.push({
        // Vendor Information
        vendorId: vendorRow?.id ?? bill.vendor_id,
        vendorCode: vendorRow?.vendor_code || null,
        vendorName: vendorRow?.name || vendorRow?.company_name || 'Unknown Vendor',
        contactPerson: vendorRow?.contact_person || null,
        mobileNumber: vendorRow?.phone || null,
        emailAddress: vendorRow?.email || null,
        // Bill Details
        billNumber: bill.bill_number || `BILL-${bill.id}`,
        billId: bill.id,
        billDate: bill.bill_date,
        dueDate: bill.due_date,
        billAmount,
        amountPaid: paidAmount,
        outstandingAmount,
        // Aging
        daysOverdue: Math.max(0, daysOverdue),
        bucket: bucket === 'above120' ? 'Above 120 Days' : bucket === 'current' ? 'Current' : `${bucket} Days`
      });
    }

    const totalOutstanding = toNumber(details.reduce((sum, row) => sum + row.outstandingAmount, 0));
    const totalOverdue = toNumber(totalOutstanding - summary.current);
    const averagePaymentDays = paymentDaysCount > 0
      ? toNumber(paymentDaysTotal / paymentDaysCount)
      : null;

    const exportOptions = {
      exportPdf: '/api/reports/ap-aging/export?format=pdf',
      exportExcel: '/api/reports/ap-aging/export?format=excel',
      printReport: true,
      emailReport: '/api/reports/ap-aging/email'
    };

    const generatedByUser = requestingUserId ? await User.findByPk(requestingUserId, { attributes: ['name'] }) : null;
    const generatedBy = generatedByUser?.name || null;
    const generatedAt = new Date().toISOString();

    return {
      report: {
        reportId,
        reportName: 'Accounts Payable Aging',
        reportDate: generatedAt,
        asOnDate,
        financialYear: query.financialYear || null,
        currency: currency || 'INR',
        reportStatus: resolvedReportStatus
      },
      summary: {
        ...summary,
        totalOutstanding,
        totalOverdue,
        totalVendors: vendorsWithOutstanding.size,
        averagePaymentDays
      },
      details,
      filters: {
        vendor: vendorSearchTerm || null,
        branch: branch || null,
        department: department || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        billStatus: billStatus || null
      },
      exportOptions,
      generatedBy,
      generatedDate: generatedAt,
      lastUpdated: generatedAt
    };
  },

  // Trial Balance Module — Basic Information / Account Details / Summary /
  // Report Filters fields from the PDF spec. Computed on demand like the
  // other reports (P&L, Balance Sheet, AR/AP Aging) rather than persisted,
  // since none of them are stored either.
  //
  // Note on "Branch"/"Department" filters from the PDF: this codebase has
  // no Branch or Department entities to filter by, so those two params are
  // accepted and echoed back under `filters` for the UI, but don't narrow
  // the result set. "Ledger" maps to a single account (same account a
  // person would open via GET /ledger/:accountId) via `ledger`/`accountId`.
  async getTrialBalance(query = {}, requestingUserId = null) {
    const {
      financialYear, reportPeriod, fromDate, toDate, currency,
      accountType, ledger, accountId, branch, department, reportStatus
    } = query;

    if (fromDate && toDate && fromDate > toDate) {
      const error = new Error('fromDate cannot be later than toDate');
      error.status = 400;
      throw error;
    }

    // Basic information — Report ID (auto-generated unique ID) and Report
    // Status (Draft / Generated / Finalized). This report is computed fresh
    // on every request rather than persisted, so the ID is generated per
    // call and Report Status defaults to "Generated" unless the caller is
    // explicitly saving it as a Draft or marking it Finalized.
    const ALLOWED_STATUSES = ['Draft', 'Generated', 'Finalized'];
    const resolvedReportStatus = ALLOWED_STATUSES.includes(reportStatus) ? reportStatus : 'Generated';
    const reportId = `TB-${Date.now()}`;

    const generatedByUser = requestingUserId ? await User.findByPk(requestingUserId, { attributes: ['name'] }) : null;
    const generatedBy = generatedByUser?.name || null;
    const generatedAt = new Date().toISOString();
    // Export Options — this report is computed fresh on every request rather
    // than saved, so there's no separate "Last Updated" timestamp to track;
    // it mirrors Generated Date for that reason.
    const exportOptions = {
      exportPdf: '/api/reports/trial-balance/export?format=pdf',
      exportExcel: '/api/reports/trial-balance/export?format=excel',
      printReport: true,
      emailReport: '/api/reports/trial-balance/email'
    };

    const accountWhere = {};
    if (accountType) accountWhere.type = accountType;
    const singleAccountId = ledger || accountId;
    if (singleAccountId) accountWhere.id = singleAccountId;
    if (branch) accountWhere.branch = branch;
    if (department) accountWhere.department = department;

    const accounts = await Account.findAll({
      where: accountWhere,
      attributes: ['id', 'code', 'name', 'type'],
      order: [['type', 'ASC'], ['name', 'ASC']]
    });

    if (accounts.length === 0) {
      return {
        report: {
          reportId,
          reportName: 'Trial Balance',
          financialYear: financialYear || null,
          reportPeriod: reportPeriod || null,
          fromDate: fromDate || null,
          toDate: toDate || null,
          currency: currency || 'INR',
          reportStatus: resolvedReportStatus
        },
        accounts: [],
        summary: { totalDebit: 0, totalCredit: 0, difference: 0, balanceStatus: 'Balanced' },
        filters: { branch: branch || null, department: department || null, accountType: accountType || null, ledger: singleAccountId || null, fromDate: fromDate || null, toDate: toDate || null },
        exportOptions,
        generatedBy,
        generatedDate: generatedAt,
        lastUpdated: generatedAt
      };
    }

    const accountIds = accounts.map((a) => a.id);

    // Opening balances: everything posted strictly before fromDate (or all
    // history, if no fromDate was given — matching how the other reports
    // here treat a missing startDate).
    const openingLines = fromDate
      ? await JournalLine.findAll({
          attributes: ['accountId', 'debit', 'credit'],
          include: [
            { model: Account, attributes: [], where: { id: { [Op.in]: accountIds } }, required: true },
            { model: JournalEntry, attributes: [], where: { date: { [Op.lt]: fromDate } }, required: true }
          ]
        })
      : [];

    // Period movements: everything within [fromDate, toDate] (or all
    // history, if neither bound was given).
    const periodWhere = buildDateWhere({ startDate: fromDate, endDate: toDate });
    const periodLines = await JournalLine.findAll({
      attributes: ['accountId', 'debit', 'credit'],
      include: [
        { model: Account, attributes: [], where: { id: { [Op.in]: accountIds } }, required: true },
        {
          model: JournalEntry,
          attributes: [],
          ...(Object.keys(periodWhere).length ? { where: periodWhere, required: true } : {})
        }
      ]
    });

    const openingNetByAccount = new Map();
    for (const line of openingLines) {
      const current = openingNetByAccount.get(line.accountId) || 0;
      openingNetByAccount.set(line.accountId, toNumber(current + toNumber(line.debit) - toNumber(line.credit)));
    }

    const periodByAccount = new Map();
    for (const line of periodLines) {
      const current = periodByAccount.get(line.accountId) || { debit: 0, credit: 0 };
      current.debit = toNumber(current.debit + toNumber(line.debit));
      current.credit = toNumber(current.credit + toNumber(line.credit));
      periodByAccount.set(line.accountId, current);
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const accountRows = accounts.map((account) => {
      const openingNet = openingNetByAccount.get(account.id) || 0;
      const period = periodByAccount.get(account.id) || { debit: 0, credit: 0 };
      const closingNet = toNumber(openingNet + period.debit - period.credit);

      const row = {
        accountCode: account.code || `ACC-${account.id}`,
        accountName: account.name,
        accountType: account.type,
        openingDebit: openingNet > 0 ? openingNet : 0,
        openingCredit: openingNet < 0 ? toNumber(-openingNet) : 0,
        debitAmount: period.debit,
        creditAmount: period.credit,
        closingDebit: closingNet > 0 ? closingNet : 0,
        closingCredit: closingNet < 0 ? toNumber(-closingNet) : 0
      };

      totalDebit = toNumber(totalDebit + row.closingDebit);
      totalCredit = toNumber(totalCredit + row.closingCredit);

      return row;
    });

    const difference = toNumber(totalDebit - totalCredit);

    return {
      report: {
        reportId,
        reportName: 'Trial Balance',
        financialYear: financialYear || null,
        reportPeriod: reportPeriod || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        currency: currency || 'INR',
        reportStatus: resolvedReportStatus
      },
      accounts: accountRows,
      summary: {
        totalDebit,
        totalCredit,
        difference,
        balanceStatus: Math.abs(difference) < 0.01 ? 'Balanced' : 'Not Balanced'
      },
      filters: {
        branch: branch || null,
        department: department || null,
        accountType: accountType || null,
        ledger: singleAccountId || null,
        fromDate: fromDate || null,
        toDate: toDate || null
      },
      exportOptions,
      generatedBy,
      generatedDate: generatedAt,
      lastUpdated: generatedAt
    };
  }
};

module.exports = ReportService;

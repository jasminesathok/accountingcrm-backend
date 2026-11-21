const ReportService = require('../services/reportService');
const { writeTrialBalancePdf, trialBalancePdfBuffer } = require('../utils/trialBalancePdf');
const { writeProfitLossPdf, profitLossPdfBuffer } = require('../utils/profitLossPdf');
const { writeARAgingPdf, arAgingPdfBuffer } = require('../utils/arAgingPdf');
const { writeBalanceSheetPdf, balanceSheetPdfBuffer } = require('../utils/balanceSheetPdf');
const { writeAPAgingPdf, apAgingPdfBuffer } = require('../utils/apAgingPdf');
const MailService = require('../utils/mailService');

const handleError = require('../utils/handleError');

exports.getProfitLoss = async (req, res) => {
  try {
    res.json(await ReportService.getProfitLoss(req.query, req.user?.id));
  } catch (err) {
    handleError(res, err);
  }
};

// Export PDF — streams the same report shown on screen as a downloadable file.
exports.exportProfitLossPdf = async (req, res) => {
  try {
    const reportData = await ReportService.getProfitLoss(req.query, req.user?.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="profit-loss.pdf"');
    writeProfitLossPdf(reportData, res);
  } catch (err) {
    handleError(res, err);
  }
};

// Email Report — generates the same PDF and sends it to the given address.
exports.emailProfitLoss = async (req, res) => {
  try {
    const { to, ...filters } = req.body || {};
    if (!to) {
      return res.status(400).json({ message: 'Recipient email (to) is required' });
    }
    const reportData = await ReportService.getProfitLoss(filters, req.user?.id);
    const pdfBuffer = await profitLossPdfBuffer(reportData);
    const info = await MailService.sendProfitLossEmail(to, reportData, pdfBuffer);
    if (!info) {
      return res.status(502).json({ message: 'Report generated but the email failed to send' });
    }
    res.json({ message: 'Profit & Loss report emailed successfully' });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getBalanceSheet = async (req, res) => {
  try {
    res.json(await ReportService.getBalanceSheet(req.query, req.user?.id));
  } catch (err) {
    handleError(res, err);
  }
};

// Export PDF — streams the same report shown on screen as a downloadable file.
exports.exportBalanceSheetPdf = async (req, res) => {
  try {
    const reportData = await ReportService.getBalanceSheet(req.query, req.user?.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="balance-sheet.pdf"');
    writeBalanceSheetPdf(reportData, res);
  } catch (err) {
    handleError(res, err);
  }
};

// Email Report — generates the same PDF and sends it to the given address.
exports.emailBalanceSheet = async (req, res) => {
  try {
    const { to, ...filters } = req.body || {};
    if (!to) {
      return res.status(400).json({ message: 'Recipient email (to) is required' });
    }
    const reportData = await ReportService.getBalanceSheet(filters, req.user?.id);
    const pdfBuffer = await balanceSheetPdfBuffer(reportData);
    const info = await MailService.sendBalanceSheetEmail(to, reportData, pdfBuffer);
    if (!info) {
      return res.status(502).json({ message: 'Report generated but the email failed to send' });
    }
    res.json({ message: 'Balance Sheet report emailed successfully' });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getARAging = async (req, res) => {
  try {
    res.json(await ReportService.getARAging(req.query, req.user?.id));
  } catch (err) {
    handleError(res, err);
  }
};

// Export PDF — streams the same report shown on screen as a downloadable file.
exports.exportARAgingPdf = async (req, res) => {
  try {
    const reportData = await ReportService.getARAging(req.query, req.user?.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ar-aging.pdf"');
    writeARAgingPdf(reportData, res);
  } catch (err) {
    handleError(res, err);
  }
};

// Email Report — generates the same PDF and sends it to the given address.
exports.emailARAging = async (req, res) => {
  try {
    const { to, ...filters } = req.body || {};
    if (!to) {
      return res.status(400).json({ message: 'Recipient email (to) is required' });
    }
    const reportData = await ReportService.getARAging(filters, req.user?.id);
    const pdfBuffer = await arAgingPdfBuffer(reportData);
    const info = await MailService.sendARAgingEmail(to, reportData, pdfBuffer);
    if (!info) {
      return res.status(502).json({ message: 'Report generated but the email failed to send' });
    }
    res.json({ message: 'A/R Aging report emailed successfully' });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getAPAging = async (req, res) => {
  try {
    res.json(await ReportService.getAPAging(req.query, req.user?.id));
  } catch (err) {
    handleError(res, err);
  }
};

// Export PDF — streams the same report shown on screen as a downloadable file.
exports.exportAPAgingPdf = async (req, res) => {
  try {
    const reportData = await ReportService.getAPAging(req.query, req.user?.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ap-aging.pdf"');
    writeAPAgingPdf(reportData, res);
  } catch (err) {
    handleError(res, err);
  }
};

// Email Report — generates the same PDF and sends it to the given address.
exports.emailAPAging = async (req, res) => {
  try {
    const { to, ...filters } = req.body || {};
    if (!to) {
      return res.status(400).json({ message: 'Recipient email (to) is required' });
    }
    const reportData = await ReportService.getAPAging(filters, req.user?.id);
    const pdfBuffer = await apAgingPdfBuffer(reportData);
    const info = await MailService.sendAPAgingEmail(to, reportData, pdfBuffer);
    if (!info) {
      return res.status(502).json({ message: 'Report generated but the email failed to send' });
    }
    res.json({ message: 'A/P Aging report emailed successfully' });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getTrialBalance = async (req, res) => {
  try {
    res.json(await ReportService.getTrialBalance(req.query, req.user?.id));
  } catch (err) {
    handleError(res, err);
  }
};

// Export PDF — streams the same report shown on screen as a downloadable file.
exports.exportTrialBalancePdf = async (req, res) => {
  try {
    const reportData = await ReportService.getTrialBalance(req.query, req.user?.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="trial-balance.pdf"');
    writeTrialBalancePdf(reportData, res);
  } catch (err) {
    handleError(res, err);
  }
};

// Email Report — generates the same PDF and sends it to the given address.
exports.emailTrialBalance = async (req, res) => {
  try {
    const { to, ...filters } = req.body || {};
    if (!to) {
      return res.status(400).json({ message: 'Recipient email (to) is required' });
    }
    const reportData = await ReportService.getTrialBalance(filters, req.user?.id);
    const pdfBuffer = await trialBalancePdfBuffer(reportData);
    const info = await MailService.sendTrialBalanceEmail(to, reportData, pdfBuffer);
    if (!info) {
      return res.status(502).json({ message: 'Report generated but the email failed to send' });
    }
    res.json({ message: 'Trial balance emailed successfully' });
  } catch (err) {
    handleError(res, err);
  }
};

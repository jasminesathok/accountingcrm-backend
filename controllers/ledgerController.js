const LedgerService = require('../services/ledgerService');
const { writeLedgerStatementPdf, ledgerStatementPdfBuffer } = require('../utils/ledgerStatementPdf');
const MailService = require('../utils/mailService');

const handleError = require('../utils/handleError');

exports.getLedger = async (req, res) => {
  try {
    res.json(await LedgerService.getLedger(req.params.accountId, req.query, req.user?.id));
  } catch (err) {
    handleError(res, err);
  }
};

// Export PDF — Ledger Statement Module's "Export Options" field. Streams
// the same statement shown on screen as a downloadable file.
exports.exportLedgerPdf = async (req, res) => {
  try {
    const statement = await LedgerService.getLedger(req.params.accountId, req.query, req.user?.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ledger-statement-${statement.ledger.ledgerCode || statement.ledger.ledgerId}.pdf"`);
    writeLedgerStatementPdf(statement, res);
  } catch (err) {
    handleError(res, err);
  }
};

// Email Statement — generates the same PDF and sends it to the given address.
exports.emailLedgerStatement = async (req, res) => {
  try {
    const { to, ...filters } = req.body || {};
    if (!to) {
      return res.status(400).json({ message: 'Recipient email (to) is required' });
    }
    const statement = await LedgerService.getLedger(req.params.accountId, filters, req.user?.id);
    const pdfBuffer = await ledgerStatementPdfBuffer(statement);
    const info = await MailService.sendLedgerStatementEmail(to, statement, pdfBuffer);
    if (!info) {
      return res.status(502).json({ message: 'Statement generated but the email failed to send' });
    }
    res.json({ message: 'Ledger statement emailed successfully' });
  } catch (err) {
    handleError(res, err);
  }
};

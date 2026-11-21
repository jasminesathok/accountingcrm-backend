const LedgerMasterService = require('../services/ledgerMasterService');
const LedgerService = require('../services/ledgerService');
const handleError = require('../utils/handleError');

exports.getAll = async (req, res) => {
  try { res.json(await LedgerMasterService.getAll(req.query)); }
  catch (err) { handleError(res, err); }
};
exports.getOne = async (req, res) => {
  try { res.json(await LedgerMasterService.getOne(req.params.id)); }
  catch (err) { handleError(res, err); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await LedgerMasterService.create(req.body, req.user?.id)); }
  catch (err) { handleError(res, err); }
};
exports.update = async (req, res) => {
  try { res.json(await LedgerMasterService.update(req.params.id, req.body, req.user?.id)); }
  catch (err) { handleError(res, err); }
};
exports.remove = async (req, res) => {
  try { await LedgerMasterService.delete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { handleError(res, err); }
};
exports.getStatement = async (req, res) => {
  try { res.json(await LedgerService.getStatementByLedgerId(req.params.id, req.query, req.user?.id)); }
  catch (err) { handleError(res, err); }
};

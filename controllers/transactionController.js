const TransactionService = require('../services/transactionService');

const handleError = require('../utils/handleError');

exports.getAll = async (req, res) => {
  try { res.json(await TransactionService.getAll(req.query)); }
  catch (err) { handleError(res, err); }
};
exports.getOne = async (req, res) => {
  try { res.json(await TransactionService.getOne(req.params.id)); }
  catch (err) { handleError(res, err); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await TransactionService.create(req.body, req.user?.id)); }
  catch (err) { handleError(res, err); }
};
exports.update = async (req, res) => {
  try { res.json(await TransactionService.update(req.params.id, req.body, req.user?.id)); }
  catch (err) { handleError(res, err); }
};
exports.remove = async (req, res) => {
  try { await TransactionService.delete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { handleError(res, err); }
};
exports.getRecent = async (req, res) => {
  try { res.json(await TransactionService.getRecent(10)); }
  catch (err) { handleError(res, err); }
};
exports.getChartData = async (req, res) => {
  try { res.json(await TransactionService.getChartData()); }
  catch (err) { handleError(res, err); }
};

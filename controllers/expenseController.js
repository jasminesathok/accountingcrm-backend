const ExpenseService = require('../services/expenseService');

const handleError = require('../utils/handleError');

exports.getAll = async (req, res) => {
  try { res.json(await ExpenseService.getAll(req.query)); }
  catch (err) { handleError(res, err); }
};
exports.getOne = async (req, res) => {
  try { res.json(await ExpenseService.getOne(req.params.id)); }
  catch (err) { handleError(res, err); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await ExpenseService.create(req.body)); }
  catch (err) { handleError(res, err); }
};
exports.update = async (req, res) => {
  try { res.json(await ExpenseService.update(req.params.id, req.body)); }
  catch (err) { handleError(res, err); }
};
exports.remove = async (req, res) => {
  try { await ExpenseService.delete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { handleError(res, err); }
};

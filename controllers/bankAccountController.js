const BankAccountService = require('../services/bankAccountService');

const handleError = require('../utils/handleError');

exports.getAll = async (req, res) => {
  try { res.json(await BankAccountService.getAll(req.user.id)); }
  catch (err) { handleError(res, err); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await BankAccountService.create(req.body, req.user.id)); }
  catch (err) { handleError(res, err); }
};
exports.update = async (req, res) => {
  try { res.json(await BankAccountService.update(req.params.id, req.body, req.user.id)); }
  catch (err) { handleError(res, err); }
};
exports.remove = async (req, res) => {
  try { await BankAccountService.delete(req.params.id, req.user.id); res.json({ message: 'Deleted' }); }
  catch (err) { handleError(res, err); }
};

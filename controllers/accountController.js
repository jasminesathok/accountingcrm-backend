const AccountService = require('../services/accountService');

const handleError = require('../utils/handleError');

exports.getAll = async (req, res) => {
  try { res.json(await AccountService.getAll(req.query)); }
  catch (err) { handleError(res, err); }
};
exports.getOne = async (req, res) => {
  try { res.json(await AccountService.getOne(req.params.id)); }
  catch (err) { handleError(res, err); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await AccountService.create(req.body, req.user)); }
  catch (err) { handleError(res, err); }
};
exports.update = async (req, res) => {
  try { res.json(await AccountService.update(req.params.id, req.body, req.user)); }
  catch (err) { handleError(res, err); }
};
exports.remove = async (req, res) => {
  try { await AccountService.delete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { handleError(res, err); }
};

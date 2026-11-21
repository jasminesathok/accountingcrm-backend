const ClientService = require('../services/clientService');

const handleError = require('../utils/handleError');

exports.getAll = async (req, res) => {
  try { res.json(await ClientService.getAll(req.query)); }
  catch (err) { handleError(res, err); }
};
exports.getOne = async (req, res) => {
  try { res.json(await ClientService.getOne(req.params.id)); }
  catch (err) { handleError(res, err); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await ClientService.create(req.body)); }
  catch (err) { handleError(res, err); }
};
exports.update = async (req, res) => {
  try { res.json(await ClientService.update(req.params.id, req.body)); }
  catch (err) { handleError(res, err); }
};
exports.remove = async (req, res) => {
  try { await ClientService.delete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { handleError(res, err); }
};

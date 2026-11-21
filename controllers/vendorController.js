const VendorService = require('../services/vendorService');

const handleError = require('../utils/handleError');

exports.getAll = async (req, res) => {
  try { res.json(await VendorService.getAll(req.query)); }
  catch (err) { handleError(res, err); }
};
exports.getOne = async (req, res) => {
  try { res.json(await VendorService.getOne(req.params.id)); }
  catch (err) { handleError(res, err); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await VendorService.create(req.body)); }
  catch (err) { handleError(res, err); }
};
exports.update = async (req, res) => {
  try { res.json(await VendorService.update(req.params.id, req.body)); }
  catch (err) { handleError(res, err); }
};
exports.remove = async (req, res) => {
  try { await VendorService.delete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { handleError(res, err); }
};

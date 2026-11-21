const InvoiceService = require('../services/invoiceService');

const handleError = require('../utils/handleError');

exports.getAll = async (req, res) => {
  try { res.json(await InvoiceService.getAll(req.query)); }
  catch (err) { handleError(res, err); }
};
exports.getOne = async (req, res) => {
  try { res.json(await InvoiceService.getOne(req.params.id)); }
  catch (err) { handleError(res, err); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await InvoiceService.create(req.body)); }
  catch (err) { handleError(res, err); }
};
exports.update = async (req, res) => {
  try { res.json(await InvoiceService.update(req.params.id, req.body)); }
  catch (err) { handleError(res, err); }
};
exports.remove = async (req, res) => {
  try { await InvoiceService.delete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { handleError(res, err); }
};
exports.getSummary = async (req, res) => {
  try { res.json(await InvoiceService.getSummary()); }
  catch (err) { handleError(res, err); }
};

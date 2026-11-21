const JournalService = require('../services/journalService');

const handleError = require('../utils/handleError');

exports.getAll = async (req, res) => {
  try { res.json(await JournalService.getAll(req.query)); }
  catch (err) { handleError(res, err); }
};
exports.getOne = async (req, res) => {
  try { res.json(await JournalService.getOne(req.params.id)); }
  catch (err) { handleError(res, err); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await JournalService.create(req.body, req.user)); }
  catch (err) { handleError(res, err); }
};
exports.update = async (req, res) => {
  try { res.json(await JournalService.update(req.params.id, req.body, req.user)); }
  catch (err) { handleError(res, err); }
};
exports.remove = async (req, res) => {
  try { await JournalService.delete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { handleError(res, err); }
};

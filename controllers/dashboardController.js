const DashboardService = require('../services/dashboardService');

const handleError = require('../utils/handleError');

exports.getSummary = async (req, res) => {
  try { res.json(await DashboardService.getSummary(req.user)); }
  catch (err) { handleError(res, err); }
};
exports.getChartData = async (req, res) => {
  try { res.json(await DashboardService.getChartData(req.user)); }
  catch (err) { handleError(res, err); }
};

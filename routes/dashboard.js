const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/summary', ctrl.getSummary);
router.get('/charts', ctrl.getChartData);

module.exports = router;

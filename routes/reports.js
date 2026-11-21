const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));
router.get('/profit-loss', ctrl.getProfitLoss);
router.get('/profit-loss/export', ctrl.exportProfitLossPdf);
router.post('/profit-loss/email', ctrl.emailProfitLoss);
router.get('/balance-sheet', ctrl.getBalanceSheet);
router.get('/balance-sheet/export', ctrl.exportBalanceSheetPdf);
router.post('/balance-sheet/email', ctrl.emailBalanceSheet);
router.get('/ar-aging', ctrl.getARAging);
router.get('/ar-aging/export', ctrl.exportARAgingPdf);
router.post('/ar-aging/email', ctrl.emailARAging);
router.get('/ap-aging', ctrl.getAPAging);
router.get('/ap-aging/export', ctrl.exportAPAgingPdf);
router.post('/ap-aging/email', ctrl.emailAPAging);
router.get('/trial-balance', ctrl.getTrialBalance);
router.get('/trial-balance/export', ctrl.exportTrialBalancePdf);
router.post('/trial-balance/email', ctrl.emailTrialBalance);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/ledgerController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));
router.get('/:accountId/export', ctrl.exportLedgerPdf);
router.post('/:accountId/email', ctrl.emailLedgerStatement);
router.get('/:accountId', ctrl.getLedger);

module.exports = router;

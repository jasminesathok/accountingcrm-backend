const router = require('express').Router();
const ctrl = require('../controllers/ledgerMasterController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const ledgerValidation = [
  body('ledger_name').trim().notEmpty().withMessage('Ledger name is required'),
  validate,
];

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.get('/:id/statement', ctrl.getStatement);
router.post('/', ledgerValidation, ctrl.create);
router.put('/:id', ledgerValidation, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

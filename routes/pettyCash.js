const router = require('express').Router();
const ctrl = require('../controllers/pettyCashController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const pettyCashValidation = [
  body('voucher_number').trim().notEmpty().withMessage('Voucher number is required'),
  body('amount').notEmpty().withMessage('Amount is required')
    .bail().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  validate,
];

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.getAll);
router.post('/', pettyCashValidation, ctrl.create);
router.put('/:id', pettyCashValidation, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

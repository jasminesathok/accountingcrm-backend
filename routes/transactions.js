const router = require('express').Router();
const ctrl = require('../controllers/transactionController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const transactionValidation = [
  body('type').trim().notEmpty().withMessage('Transaction type is required')
    .bail().isIn(['income', 'expense', 'transfer', 'journal']).withMessage('Invalid transaction type'),
  body('date').trim().notEmpty().withMessage('Transaction date is required'),
  body('amount').notEmpty().withMessage('Amount is required')
    .bail().isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  validate,
];

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.getAll);
router.get('/recent', ctrl.getRecent);
router.get('/chart', ctrl.getChartData);
router.get('/:id', ctrl.getOne);
router.post('/', transactionValidation, ctrl.create);
router.put('/:id', transactionValidation, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

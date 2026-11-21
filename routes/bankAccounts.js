const router = require('express').Router();
const ctrl = require('../controllers/bankAccountController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const bankAccountValidation = [
  body('account_number').trim().notEmpty().withMessage('Account number is required')
    .bail().matches(/^\d{9,18}$/).withMessage('Account number must be 9-18 digits, numbers only'),
  validate,
];

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.getAll);
router.post('/', bankAccountValidation, ctrl.create);
router.put('/:id', bankAccountValidation, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

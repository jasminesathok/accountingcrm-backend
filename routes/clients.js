const router = require('express').Router();
const ctrl = require('../controllers/clientController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const PHONE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const clientValidation = [
  body('phone').optional({ checkFalsy: true }).matches(PHONE_REGEX).withMessage('Enter a valid 10-digit mobile number'),
  body('alternate_mobile').optional({ checkFalsy: true }).matches(PHONE_REGEX).withMessage('Enter a valid 10-digit mobile number'),
  body('gst_number').optional({ checkFalsy: true }).customSanitizer(v => v.toUpperCase()).matches(GST_REGEX).withMessage('Enter a valid GSTIN (e.g. 22AAAAA0000A1Z5)'),
  body('pan_number').optional({ checkFalsy: true }).customSanitizer(v => v.toUpperCase()).matches(PAN_REGEX).withMessage('Enter a valid PAN (e.g. AAAAA0000A)'),
  body('ifsc_code').optional({ checkFalsy: true }).customSanitizer(v => v.toUpperCase()).matches(IFSC_REGEX).withMessage('Enter a valid IFSC code (e.g. HDFC0001234)'),
  validate,
];

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', clientValidation, ctrl.create);
router.put('/:id', clientValidation, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

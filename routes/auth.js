const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('confirmPassword').notEmpty(),
  body('role').optional().isIn(['admin']),
  validate,
], ctrl.register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  validate,
], ctrl.login);

router.get('/me', authenticate, ctrl.me);

module.exports = router;

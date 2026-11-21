const AuthService = require('../services/authService');

const handleError = (res, err) => {
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
};

exports.register = async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (err) { handleError(res, err); }
};

exports.login = async (req, res) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (err) { handleError(res, err); }
};

exports.me = async (req, res) => {
  try {
    const user = await AuthService.me(req.user.id);
    res.json(user);
  } catch (err) { handleError(res, err); }
};

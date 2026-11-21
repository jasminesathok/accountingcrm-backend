const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

const AuthService = {
  async register({ name, email, password, confirmPassword, role }) {
    if (!name || !email || !password || !confirmPassword) {
      throw { status: 400, message: 'Name, email, password, and confirm password are required' };
    }

    if (password !== confirmPassword) {
      throw { status: 400, message: 'Password and confirm password do not match' };
    }

    if (role && role !== 'admin') {
      throw { status: 400, message: 'Only admin registration is allowed' };
    }

    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount > 0) {
      throw { status: 403, message: 'Admin already exists. Please contact your administrator.' };
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });
    const token = this.generateToken(user);
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
  },

  async login({ email, password }) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new Error('Invalid credentials');

    const token = this.generateToken(user);
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
  },

  async me(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },

  generateToken(user) {
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
  }
};

module.exports = AuthService;

/**
 * Backend Password Strength Validation
 */

const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  // ONLY requirement: minimum 6 characters
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
};

module.exports = { validatePasswordStrength };

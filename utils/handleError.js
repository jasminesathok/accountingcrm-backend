/**
 * Shared API error handler.
 * Gives clear, actionable messages for common Sequelize failure modes
 * (especially foreign-key constraint errors on delete) instead of
 * leaking raw DB errors or falling back to a blank "Server error".
 */
const handleError = (res, err) => {
  // Deleting/updating a row that other tables still reference
  // (e.g. deleting a Client that has Invoices, a Vendor with Bills,
  // an Account used in Journal Lines/Transactions, an Invoice/Bill
  // with Payments recorded against it).
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({
      message: 'Cannot delete this record because other records (invoices, bills, payments, journal entries, etc.) still reference it. Remove or reassign those first.'
    });
  }

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(422).json({
      message: err.errors?.[0]?.message || 'Validation error',
      errors: err.errors
    });
  }

  return res.status(err.status || 500).json({ message: err.message || 'Server error' });
};

module.exports = handleError;

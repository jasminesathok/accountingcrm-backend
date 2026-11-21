const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Field set mirrors the "Accounting CRM - Petty Cash Module" PDF spec.
const PettyCash = sequelize.define('PettyCash', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  // Basic information
  petty_cash_code: { type: DataTypes.STRING, allowNull: true, unique: true }, // Petty Cash ID (auto-generated unique)
  voucher_number: { type: DataTypes.STRING, allowNull: false, unique: true },
  transaction_date: { type: DataTypes.DATEONLY, allowNull: true },
  transaction_type: { type: DataTypes.ENUM('receipt', 'payment'), allowNull: true, defaultValue: 'payment' },
  expense_category: { type: DataTypes.STRING, allowNull: true }, // Office, Travel, Refreshments, Stationery, etc.
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: true, defaultValue: 'pending' },

  // Payee / Received From details
  payee_name: { type: DataTypes.STRING, allowNull: true }, // Employee/Vendor Name
  department: { type: DataTypes.STRING, allowNull: true },
  contact_number: { type: DataTypes.STRING, allowNull: true },
  purpose: { type: DataTypes.TEXT, allowNull: true },

  // Transaction details
  description: { type: DataTypes.TEXT, allowNull: true },
  payment_method: { type: DataTypes.STRING, allowNull: true, defaultValue: 'cash' },
  reference_number: { type: DataTypes.STRING, allowNull: true },
  receipt_number: { type: DataTypes.STRING, allowNull: true },
  bill_number: { type: DataTypes.STRING, allowNull: true },
  amount_received: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
  balance_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },

  // Approval details
  requested_by: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.STRING, allowNull: true },
  approval_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: true, defaultValue: 'pending' },
  approval_date: { type: DataTypes.DATEONLY, allowNull: true },

  // Attachments
  receipt_upload: { type: DataTypes.STRING, allowNull: true },
  bill_attachment: { type: DataTypes.STRING, allowNull: true },
  supporting_documents: { type: DataTypes.STRING, allowNull: true },

  // Notes
  remarks: { type: DataTypes.TEXT, allowNull: true },
  internal_notes: { type: DataTypes.TEXT, allowNull: true },

  // System fields (createdAt/updatedAt handled automatically by Sequelize timestamps)
  created_by: { type: DataTypes.STRING, allowNull: true },
  updated_by: { type: DataTypes.STRING, allowNull: true },
  last_modified: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'PETTY_CASH'
});

module.exports = PettyCash;

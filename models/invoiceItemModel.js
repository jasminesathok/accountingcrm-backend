const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InvoiceItem = sequelize.define('InvoiceItem', {
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  product_service: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  hsn_sac_code: DataTypes.STRING,
  quantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 1
  },
  unit: DataTypes.STRING,
  unit_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  discount_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  tax_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  line_total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'INVOICE_ITEM'
});

module.exports = InvoiceItem;

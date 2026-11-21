const Transaction = require('../models/transactionModel');
const Invoice = require('../models/invoiceModel');
const Bill = require('../models/billModel');
const Client = require('../models/clientModel');
const Vendor = require('../models/vendorModel');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

const DashboardService = {
  async getSummary(user) {
    let transactionWhere = {};
    let invoiceWhere = {};
    let billWhere = {};

    if (user.role === 'user') { // Client
      const client = await Client.findOne({ where: { user_id: user.id } });
      if (client) {
        const invoiceIds = (await Invoice.findAll({ where: { client_id: client.id }, attributes: ['id'] })).map(i => i.id);
        transactionWhere = { reference_type: 'invoice', reference_id: { [Op.in]: invoiceIds } };
        invoiceWhere = { client_id: client.id };
        billWhere = { id: -1 }; // Hide bills from clients
      }
    } else if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ where: { user_id: user.id } });
      if (vendor) {
        const billIds = (await Bill.findAll({ where: { vendor_id: vendor.id }, attributes: ['id'] })).map(b => b.id);
        transactionWhere = { reference_type: 'bill', reference_id: { [Op.in]: billIds } };
        billWhere = { vendor_id: vendor.id };
        invoiceWhere = { id: -1 }; // Hide invoices from vendors
      }
    }

    const totals = await Transaction.findAll({
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: transactionWhere,
      group: ['type']
    });

    const summary = {
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      pendingInvoices: await Invoice.sum('total_amount', { where: { ...invoiceWhere, status: 'pending' } }) || 0,
      overdueInvoices: await Invoice.sum('total_amount', { where: { ...invoiceWhere, status: 'overdue' } }) || 0,
      paidInvoices: await Invoice.sum('total_amount', { where: { ...invoiceWhere, status: 'paid' } }) || 0,
      totalInvoiceCount: await Invoice.count({ where: invoiceWhere }),
      recentTransactions: await Transaction.findAll({ 
        where: transactionWhere,
        limit: 5, 
        order: [['created_at', 'DESC']] 
      })
    };

    totals.forEach(t => {
      if (t.type === 'income') summary.totalRevenue = parseFloat(t.get('total'));
      if (t.type === 'expense') summary.totalExpenses = parseFloat(t.get('total'));
    });

    summary.netIncome = summary.totalRevenue - summary.totalExpenses;
    return summary;
  },

  async getChartData(user) {
    let transactionWhere = {
      date: { [Op.gte]: sequelize.literal('DATE_SUB(CURDATE(), INTERVAL 6 MONTH)') }
    };

    if (user.role === 'user') {
      const client = await Client.findOne({ where: { user_id: user.id } });
      if (client) {
        const invoiceIds = (await Invoice.findAll({ where: { client_id: client.id }, attributes: ['id'] })).map(i => i.id);
        transactionWhere = { ...transactionWhere, reference_type: 'invoice', reference_id: { [Op.in]: invoiceIds } };
      }
    } else if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ where: { user_id: user.id } });
      if (vendor) {
        const billIds = (await Bill.findAll({ where: { vendor_id: vendor.id }, attributes: ['id'] })).map(b => b.id);
        transactionWhere = { ...transactionWhere, reference_type: 'bill', reference_id: { [Op.in]: billIds } };
      }
    }

    const rows = await Transaction.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m'), 'month'],
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: transactionWhere,
      group: ['month', 'type'],
      order: [['month', 'ASC']]
    });

    const months = {};
    rows.forEach(r => {
      const month = r.get('month');
      if (!months[month]) months[month] = { month, income: 0, expense: 0 };
      if (r.type === 'income') months[month].income = parseFloat(r.get('total'));
      if (r.type === 'expense') months[month].expense = parseFloat(r.get('total'));
    });

    return Object.values(months);
  }
};

module.exports = DashboardService;

const Account = require('../models/accountModel');

const seedData = async () => {
  const count = await Account.count();
  if (count === 0) {
    console.log('🌱 Seeding default Chart of Accounts...');
    // `account_category` values below are set to match the Profit & Loss
    // Module PDF spec's field names exactly (Sales Revenue, Rent Expense,
    // etc.) so a fresh install's P&L report buckets these accounts under
    // the right line item automatically — see reportService.getProfitLoss.
    await Account.bulkCreate([
      { name: 'Cash', type: 'Asset', balance: 0 },
      { name: 'Accounts Receivable', type: 'Asset', balance: 0 },
      { name: 'Inventory', type: 'Asset', balance: 0 },
      { name: 'Accounts Payable', type: 'Liability', balance: 0 },
      { name: 'Sales Revenue', type: 'Income', balance: 0, account_category: 'Sales Revenue' },
      { name: 'Service Revenue', type: 'Income', balance: 0, account_category: 'Service Revenue' },
      { name: 'Cost of Goods Sold', type: 'Expense', balance: 0, account_category: 'Cost of Goods Sold' },
      { name: 'Salaries Expense', type: 'Expense', balance: 0, account_category: 'Salary Expense' },
      { name: 'Rent Expense', type: 'Expense', balance: 0, account_category: 'Rent Expense' },
      { name: 'Utilities Expense', type: 'Expense', balance: 0, account_category: 'Utility Expense' }
    ]);
    console.log('✅ Seeding completed');
  }
};

module.exports = seedData;

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const MailService = {
  async sendWelcomeEmail(to, name, password, role) {
    const from = process.env.MAIL_FROM || '"AccountantCRM" <noreply@accountantcrm.com>';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #4a90e2; text-align: center;">Welcome to AccountantCRM!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>An administrator has created a <strong>${role}</strong> account for you. You can now log in to the system using the following credentials:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4a90e2;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 5px 0;"><strong>Initial Password:</strong> <code style="background: #eee; padding: 2px 5px; border-radius: 3px;">${password}</code></p>
        </div>
        
        <p>For security reasons, we recommend that you change your password after your first login.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
             style="background-color: #4a90e2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Login to Dashboard
          </a>
        </div>
        
        <p style="font-size: 12px; color: #777; margin-top: 40px; text-align: center;">
          If you did not expect this email, please ignore it.
        </p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: `Welcome to AccountantCRM - Your ${role} Account`,
        html,
      });
      console.log('✅ Welcome email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      // We don't throw here to avoid failing the whole transaction if mail fails
      // though in high-integrity systems you might want to.
      return null;
    }
  },

  // Email Report — Trial Balance Module's "Additional Details" / Export
  // Options field. Attaches the same PDF the Export PDF button downloads.
  async sendTrialBalanceEmail(to, reportData, pdfBuffer) {
    const from = process.env.MAIL_FROM || '"AccountantCRM" <noreply@accountantcrm.com>';
    const { report, summary } = reportData;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #4a90e2; text-align: center;">Trial Balance Report</h2>
        <p>Please find the attached Trial Balance report.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4a90e2;">
          <p style="margin: 5px 0;"><strong>Report ID:</strong> ${report.reportId || '—'}</p>
          <p style="margin: 5px 0;"><strong>Financial Year:</strong> ${report.financialYear || '—'}</p>
          <p style="margin: 5px 0;"><strong>Period:</strong> ${report.fromDate || '...'} to ${report.toDate || '...'}</p>
          <p style="margin: 5px 0;"><strong>Total Debit:</strong> ${summary.totalDebit}</p>
          <p style="margin: 5px 0;"><strong>Total Credit:</strong> ${summary.totalCredit}</p>
          <p style="margin: 5px 0;"><strong>Balance Status:</strong> ${summary.balanceStatus}</p>
        </div>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Trial Balance Report',
        html,
        attachments: [{ filename: 'trial-balance.pdf', content: pdfBuffer }]
      });
      console.log('✅ Trial balance email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending trial balance email:', error);
      return null;
    }
  },

  // Email Report — Profit & Loss Module's Export Options field. Attaches
  // the same PDF the Export PDF button downloads.
  async sendProfitLossEmail(to, reportData, pdfBuffer) {
    const from = process.env.MAIL_FROM || '"AccountantCRM" <noreply@accountantcrm.com>';
    const { report, income, cogs, operatingExpenses, profit } = reportData;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #4a90e2; text-align: center;">Profit & Loss Report</h2>
        <p>Please find the attached Profit &amp; Loss report.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4a90e2;">
          <p style="margin: 5px 0;"><strong>Report ID:</strong> ${report.reportId || '—'}</p>
          <p style="margin: 5px 0;"><strong>Financial Year:</strong> ${report.financialYear || '—'}</p>
          <p style="margin: 5px 0;"><strong>Period:</strong> ${report.fromDate || '...'} to ${report.toDate || '...'}</p>
          <p style="margin: 5px 0;"><strong>Total Income:</strong> ${income.totalIncome}</p>
          <p style="margin: 5px 0;"><strong>Cost of Goods Sold:</strong> ${cogs.costOfGoodsSold}</p>
          <p style="margin: 5px 0;"><strong>Total Operating Expenses:</strong> ${operatingExpenses.totalOperatingExpenses}</p>
          <p style="margin: 5px 0;"><strong>Net Profit After Tax:</strong> ${profit.netProfitAfterTax}</p>
        </div>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Profit & Loss Report',
        html,
        attachments: [{ filename: 'profit-loss.pdf', content: pdfBuffer }]
      });
      console.log('✅ Profit & Loss email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending profit & loss email:', error);
      return null;
    }
  },

  // Email Report — A/R Aging Module's Export Options field. Attaches the
  // same PDF the Export PDF button downloads.
  async sendARAgingEmail(to, reportData, pdfBuffer) {
    const from = process.env.MAIL_FROM || '"AccountantCRM" <noreply@accountantcrm.com>';
    const { report, summary } = reportData;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #4a90e2; text-align: center;">Accounts Receivable Aging Report</h2>
        <p>Please find the attached A/R Aging report.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4a90e2;">
          <p style="margin: 5px 0;"><strong>Report ID:</strong> ${report.reportId || '—'}</p>
          <p style="margin: 5px 0;"><strong>As On Date:</strong> ${report.asOnDate || '—'}</p>
          <p style="margin: 5px 0;"><strong>Total Outstanding:</strong> ${summary.totalOutstanding}</p>
          <p style="margin: 5px 0;"><strong>Total Overdue:</strong> ${summary.totalOverdue}</p>
          <p style="margin: 5px 0;"><strong>Total Customers:</strong> ${summary.totalCustomers}</p>
        </div>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Accounts Receivable Aging Report',
        html,
        attachments: [{ filename: 'ar-aging.pdf', content: pdfBuffer }]
      });
      console.log('✅ A/R Aging email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending A/R Aging email:', error);
      return null;
    }
  },

  // Email Report — Accounts Payable Aging Module's Export Options field.
  // Attaches the same PDF the Export PDF button downloads.
  async sendAPAgingEmail(to, reportData, pdfBuffer) {
    const from = process.env.MAIL_FROM || '"AccountantCRM" <noreply@accountantcrm.com>';
    const { report, summary } = reportData;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #4a90e2; text-align: center;">Accounts Payable Aging Report</h2>
        <p>Please find the attached A/P Aging report.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4a90e2;">
          <p style="margin: 5px 0;"><strong>Report ID:</strong> ${report.reportId || '—'}</p>
          <p style="margin: 5px 0;"><strong>As On Date:</strong> ${report.asOnDate || '—'}</p>
          <p style="margin: 5px 0;"><strong>Total Outstanding:</strong> ${summary.totalOutstanding}</p>
          <p style="margin: 5px 0;"><strong>Total Overdue:</strong> ${summary.totalOverdue}</p>
          <p style="margin: 5px 0;"><strong>Total Vendors:</strong> ${summary.totalVendors}</p>
        </div>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Accounts Payable Aging Report',
        html,
        attachments: [{ filename: 'ap-aging.pdf', content: pdfBuffer }]
      });
      console.log('✅ A/P Aging email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending A/P Aging email:', error);
      return null;
    }
  },

  // Email Report — Balance Sheet Module's Export Options field. Attaches
  // the same PDF the Export PDF button downloads.
  async sendBalanceSheetEmail(to, reportData, pdfBuffer) {
    const from = process.env.MAIL_FROM || '"AccountantCRM" <noreply@accountantcrm.com>';
    const { report, balanceSummary } = reportData;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #4a90e2; text-align: center;">Balance Sheet</h2>
        <p>Please find the attached Balance Sheet report.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4a90e2;">
          <p style="margin: 5px 0;"><strong>Report ID:</strong> ${report.reportId || '—'}</p>
          <p style="margin: 5px 0;"><strong>As On Date:</strong> ${report.asOnDate || '—'}</p>
          <p style="margin: 5px 0;"><strong>Total Assets:</strong> ${balanceSummary.totalAssets}</p>
          <p style="margin: 5px 0;"><strong>Total Liabilities:</strong> ${balanceSummary.totalLiabilities}</p>
          <p style="margin: 5px 0;"><strong>Total Equity:</strong> ${balanceSummary.totalEquity}</p>
          <p style="margin: 5px 0;"><strong>Balance Status:</strong> ${balanceSummary.balanceStatus}</p>
        </div>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Balance Sheet Report',
        html,
        attachments: [{ filename: 'balance-sheet.pdf', content: pdfBuffer }]
      });
      console.log('✅ Balance Sheet email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending Balance Sheet email:', error);
      return null;
    }
  },

  // Email Statement — Ledger Statement Module's "Export Options" field.
  // Attaches the same PDF the Export PDF button downloads.
  async sendLedgerStatementEmail(to, statement, pdfBuffer) {
    const from = process.env.MAIL_FROM || '"AccountantCRM" <noreply@accountantcrm.com>';
    const { statementId, ledger, fromDate, toDate, openingBalance, totalDebit, totalCredit, closingBalance, closingBalanceType } = statement;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #4a90e2; text-align: center;">Ledger Statement</h2>
        <p>Please find the attached Ledger Statement.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4a90e2;">
          <p style="margin: 5px 0;"><strong>Statement ID:</strong> ${statementId || '—'}</p>
          <p style="margin: 5px 0;"><strong>Ledger:</strong> ${ledger?.ledgerName || '—'} (${ledger?.ledgerCode || '—'})</p>
          <p style="margin: 5px 0;"><strong>Period:</strong> ${fromDate || '...'} to ${toDate || '...'}</p>
          <p style="margin: 5px 0;"><strong>Opening Balance:</strong> ${openingBalance}</p>
          <p style="margin: 5px 0;"><strong>Total Debit:</strong> ${totalDebit}</p>
          <p style="margin: 5px 0;"><strong>Total Credit:</strong> ${totalCredit}</p>
          <p style="margin: 5px 0;"><strong>Closing Balance:</strong> ${closingBalance} ${closingBalanceType || ''}</p>
        </div>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Ledger Statement',
        html,
        attachments: [{ filename: 'ledger-statement.pdf', content: pdfBuffer }]
      });
      console.log('✅ Ledger statement email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending ledger statement email:', error);
      return null;
    }
  }
};

module.exports = MailService;

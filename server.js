require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

/* =======================
   ✅ CORS CONFIG (FIXED)
======================= */
const allowedOrigins = [
  "http://localhost:5173",
  "https://acc.aminoid.in",
  "https://accountantcrm-frontend.vercel.app",
  "https://accountingcrm-frontend.onrender.com"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests without origin (Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error("❌ CORS blocked:", origin);
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true
}));

// Handle preflight requests
app.options("*", cors());

/* =======================
   ✅ MIDDLEWARE
======================= */
app.use(express.json());

/* =======================
   ✅ ROOT ROUTE
======================= */
app.get('/', (req, res) => {
  res.send('🚀 AccountantCRM API is running...');
});

/* =======================
   ✅ ROUTES
======================= */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/ledger', require('./routes/ledger'));
app.use('/api/ledgers', require('./routes/ledgers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/bank-accounts', require('./routes/bankAccounts'));
app.use('/api/petty-cash', require('./routes/pettyCash'));
app.use('/api/dashboard', require('./routes/dashboard'));

/* =======================
   ✅ HEALTH CHECK
======================= */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date() });
});

/* =======================
   ✅ GLOBAL ERROR HANDLER
======================= */
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  res.status(500).json({
    message: err.message || 'Internal server error'
  });
});

/* =======================
   ✅ DATABASE + SERVER
======================= */
const { sequelize, connectDB } = require('./config/db');
const seedData = require('./config/seed');
const runMigrations = require('./utils/runMigrations');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    await sequelize.sync(); // Use { force: true } only in dev if needed
    console.log('✅ All models synchronized');

    // Applies column/table changes from migrations/ automatically (e.g. the
    // Account.code column) — see utils/runMigrations.js for why this is
    // safe to run on every start instead of needing a manual command.
    await runMigrations(sequelize.getQueryInterface());
    console.log('✅ Migrations applied');

    await seedData();

    app.listen(PORT, () => {
      console.log(`🚀 AccountantCRM API running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
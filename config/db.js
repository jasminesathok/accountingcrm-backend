
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Aiven SSL certificate
const sslCA = process.env.DB_SSL_CA
  ? process.env.DB_SSL_CA.replace(/\\n/g, '\n')
  : undefined;

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'accountant_crm',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'Raji@2025',
  {
    host: process.env.DB_HOST || 'localhost',

    // Aiven MySQL custom port
    port: Number(process.env.DB_PORT || 3306),

    dialect: 'mysql',
    logging: false,

    // SSL configuration
    dialectOptions: sslCA
      ? {
          ssl: {
            ca: sslCA,
            rejectUnauthorized: true
          }
        }
      : {},

    // Connection pool
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },

    // Model configuration
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Connect to database
const connectDB = async () => {
  try {
    await sequelize.authenticate();

    console.log('✅ Sequelize connected to MySQL successfully');
    console.log(`✅ Database: ${process.env.DB_NAME}`);
    console.log(`✅ Database Host: ${process.env.DB_HOST}`);
    console.log(`✅ Database Port: ${process.env.DB_PORT}`);

  } catch (error) {
    console.error(
      '❌ Unable to connect to the database:',
      error.message
    );

    throw error;
  }
};

module.exports = {
  sequelize,
  connectDB
};

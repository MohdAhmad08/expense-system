const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.MYSQL_URL;
let dialect = process.env.DB_DIALECT || 'postgres'; // Default to postgres

if (connectionString) {
  if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
    dialect = 'postgres';
  } else if (connectionString.startsWith('mysql://')) {
    dialect = 'mysql';
  }
}

let sequelize;

if (connectionString) {
  console.log(`Initializing Sequelize with Connection URL (${dialect})...`);
  const options = {
    dialect: dialect,
    logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };

  if (dialect === 'postgres') {
    options.dialectModule = require('pg');
    options.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    };
  } else if (dialect === 'mysql') {
    options.dialectModule = require('mysql2');
    options.timezone = '+05:30';
  }

  sequelize = new Sequelize(connectionString, options);
} else if (dialect === 'sqlite') {
  console.log('Initializing Sequelize with SQLite...');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || path.join(__dirname, '../database.sqlite'),
    logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false
  });
} else if (dialect === 'postgres') {
  console.log('Initializing Sequelize with PostgreSQL...');
  sequelize = new Sequelize(
    process.env.DB_NAME || 'shared_expenses',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      dialectModule: require('pg'),
      logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  console.log('Initializing Sequelize with MySQL...');
  sequelize = new Sequelize(
    process.env.DB_NAME || 'shared_expenses',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      dialectModule: require('mysql2'),
      logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      timezone: '+05:30'
    }
  );
}

module.exports = sequelize;

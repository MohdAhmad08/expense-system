const app = require('./app');
const { sequelize } = require('./models');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('Attempting to connect to MySQL database via Sequelize...');
    await sequelize.authenticate();
    console.log('MySQL Database Connection established successfully.');

    // Sync database models (alter tables in place if modifications were made)
    console.log('Synchronizing database models...');
    const syncOptions = process.env.DB_DIALECT === 'sqlite' ? {} : { alter: true };
    await sequelize.sync(syncOptions);
    console.log('Database models synced successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (error) {
    console.error('========================================================================');
    console.error('CRITICAL: Server initialization failed due to database connection error!');
    console.error('Details:', error.message);
    console.error('------------------------------------------------------------------------');
    console.error('Please verify the following:');
    console.error('1. XAMPP Control Panel is open and MySQL service is started.');
    console.error('2. MySQL is listening on port 3306 (default).');
    console.error('3. You have created the database "shared_expenses" using phpMyAdmin or SQL CLI:');
    console.error('   CREATE DATABASE `shared_expenses` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    console.error('========================================================================');
    process.exit(1);
  }
};

startServer();

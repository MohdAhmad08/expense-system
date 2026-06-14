const app = require('./app');
const { sequelize } = require('./models'); // Import from models to register associations
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const dialect = sequelize.getDialect();
  try {
    console.log(`Attempting to connect to ${dialect} database via Sequelize...`);
    await sequelize.authenticate();
    console.log(`${dialect.toUpperCase()} Database Connection established successfully.`);

    // Sync database models (alter tables in place if modifications were made)
    console.log('Synchronizing database models...');
    const syncOptions = dialect === 'sqlite' ? {} : { alter: true };
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
    console.error('Please verify the following based on your dialect:');
    if (dialect === 'postgres') {
      console.error('1. PostgreSQL service is started and running.');
      console.error('2. PostgreSQL is listening on port 5432 (default).');
      console.error('3. You have created the database "shared_expenses".');
    } else if (dialect === 'mysql') {
      console.error('1. XAMPP Control Panel is open and MySQL service is started.');
      console.error('2. MySQL is listening on port 3306 (default).');
      console.error('3. You have created the database "shared_expenses" using phpMyAdmin or SQL CLI:');
      console.error('   CREATE DATABASE `shared_expenses` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    } else if (dialect === 'sqlite') {
      console.error('1. Check that the database storage path is writable.');
    }
    console.error('========================================================================');
    process.exit(1);
  }
};

startServer();

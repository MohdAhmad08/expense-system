const app = require('../app');
const { sequelize } = require('../models');

let isSynced = false;

module.exports = async (req, res) => {
  // Ensure database is connected and synced on function invocation
  if (!isSynced) {
    try {
      console.log('[Vercel Serverless] Initializing Sequelize connection...');
      await sequelize.authenticate();
      console.log('[Vercel Serverless] Sequelize connected successfully.');
      
      const syncOptions = process.env.DB_DIALECT === 'sqlite' ? {} : { alter: true };
      console.log('[Vercel Serverless] Syncing database models with options:', syncOptions);
      await sequelize.sync(syncOptions);
      isSynced = true;
      console.log('[Vercel Serverless] Database sync completed.');
    } catch (error) {
      console.error('[Vercel Serverless] Database connection/sync failed:', error.message);
      // We do not block request handling entirely; let the request pass to Express in case it's a health check
    }
  }

  // Delegate the request to the Express application
  return app(req, res);
};

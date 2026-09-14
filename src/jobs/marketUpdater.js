const cron = require('node-cron');
const currencyService = require('../services/currencyService');
const logger = require('../utils/logger');

// Run every 5 minutes to update exchange rates (optional)
const startMarketUpdater = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Just fetch and cache will update automatically
      await currencyService.getRates();
      logger.info('Exchange rates updated');
    } catch (error) {
      logger.error(`Market updater error: ${error.message}`);
    }
  });
};

module.exports = startMarketUpdater;
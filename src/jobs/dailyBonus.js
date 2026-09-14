// src/jobs/dailyBonus.js
const cron = require('node-cron');
const bonusService = require('../services/bonusService');
const logger = require('../utils/logger');

const startDailyBonus = () => {
  // Log current time and timezone at startup
  const now = new Date();
  logger.info(`🕒 Current server time: ${now.toString()}`);
  logger.info(`🕒 Current UTC time: ${now.toUTCString()}`);
  logger.info(`🕒 Current local time (Africa/Lagos): ${now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}`);

  // Schedule job at 3:25 AM Nigeria time
  const task = cron.schedule(
    '02 4 * * *',
    async () => {
      const startTime = new Date();
      logger.info(`🎁 Daily bonus job started at ${startTime.toISOString()}`);
      logger.info(`🎁 Local time (Africa/Lagos): ${startTime.toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}`);

      try {
        const creditedUsers = await bonusService.addDailyBonusToAllUsers(15);
        logger.info(`✅ Daily bonus completed. ${creditedUsers} users credited.`);
      } catch (error) {
        logger.error(`❌ Daily bonus job failed: ${error.stack || error.message}`);
      }
    },
    {
      timezone: 'Africa/Lagos',
    }
  );

  logger.info('📅 Daily bonus scheduled for 04:02 AM (Africa/Lagos).');

  return task;
};

module.exports = startDailyBonus;
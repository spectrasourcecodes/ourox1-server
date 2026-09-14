// src/services/bonusService.js
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class BonusService {
  async addDailyBonusToAllUsers(amount = 15) {
    logger.info(`🔍 Fetching active users with role 'user'...`);

    const users = await User.find({ isActive: true, role: 'user' });
    logger.info(`👥 Found ${users.length} active users.`);

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        // Find wallet
        const wallet = await Wallet.findOne({ user: user._id });
        if (!wallet) {
          logger.warn(`⚠️ No wallet found for user ${user.email} (${user._id})`);
          failCount++;
          continue;
        }

        // Add to balance
        wallet.balance = (wallet.balance || 0) + amount;
        // Add to profitBalance
        wallet.profitBalance = (wallet.profitBalance || 0) + amount;
        await wallet.save();

        // Create notification
        await notificationService.notifyUser(
          user._id,
          '💰 Daily Bonus Added',
          `You've received $${amount} as your daily bonus! (Balance + Profit)`,
          'info',
          { amount },
          false
        );

        successCount++;
        logger.info(`✅ Bonus added to ${user.email} (${user._id})`);
      } catch (error) {
        failCount++;
        logger.error(`❌ Failed to add bonus for user ${user.email} (${user._id}): ${error.message}`);
      }
    }

    logger.info(`📊 Daily bonus summary: ${successCount} succeeded, ${failCount} failed.`);
    return successCount;
  }
}

module.exports = new BonusService();
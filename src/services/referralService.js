const User = require('../models/User');
const Referral = require('../models/Referral');
const WalletService = require('./walletService');
const Setting = require('../models/Setting');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

class ReferralService {
  // Generate referral code for user (already handled in User model pre-save)
  
  // Get referral stats for a user
  async getReferralStats(userId) {
    const referrals = await Referral.find({ referrer: userId }).populate('referredUser', 'fullName email createdAt');
    const totalEarned = referrals.reduce((sum, r) => sum + r.earnings, 0);
    const totalReferrals = referrals.length;
    // Get leaderboard info if needed
    return {
      totalReferrals,
      totalEarned,
      referrals: referrals.map(r => ({
        user: r.referredUser,
        earnings: r.earnings,
        bonusType: r.bonusType,
        earnedAt: r.amountEarnedAt,
      })),
    };
  }

  // Process referral bonus when a referred user deposits or invests
  async processReferralBonus(referredUserId, amount, type) {
    // Find the referrer
    const referredUser = await User.findById(referredUserId);
    if (!referredUser || !referredUser.referredBy) {
      return null; // no referrer
    }

    // Get referral bonus percentage from settings
    const setting = await Setting.findOne({ key: 'referralBonus' });
    const bonusPercentage = setting ? parseFloat(setting.value) : 5; // default 5%

    const bonusAmount = (amount * bonusPercentage) / 100;
    if (bonusAmount <= 0) return null;

    // Credit to referrer
    await WalletService.updateBalance(
      referredUser.referredBy,
      bonusAmount,
      'referral',
      `Referral bonus from ${referredUser.fullName} (${type})`
    );

    // Record referral earnings
    const referral = new Referral({
      referrer: referredUser.referredBy,
      referredUser: referredUserId,
      earnings: bonusAmount,
      currency: 'USD',
      bonusType: type === 'deposit' ? 'deposit_bonus' : 'investment_bonus',
    });
    await referral.save();

    // Update referrer's referral balance (already done via wallet update)
    logger.info(`Referral bonus ${bonusAmount} awarded to ${referredUser.referredBy} from ${referredUserId}`);
    return referral;
  }

  // Get leaderboard (top referrers)
  async getLeaderboard(limit = 10) {
    const referrals = await Referral.aggregate([
      { $group: { _id: '$referrer', totalEarnings: { $sum: '$earnings' }, count: { $sum: 1 } } },
      { $sort: { totalEarnings: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { 'user.fullName': 1, 'user.email': 1, totalEarnings: 1, count: 1 } },
    ]);
    return referrals;
  }
}

module.exports = new ReferralService();
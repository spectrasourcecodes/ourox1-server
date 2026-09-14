const Investment = require('../models/Investment');
const InvestmentPlan = require('../models/InvestmentPlan');
const WalletService = require('./walletService');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

class InvestmentService {
  // Purchase an investment plan
  async purchasePlan(userId, planId, amount) {
    const plan = await InvestmentPlan.findById(planId);
    if (!plan) throw new AppError('Investment plan not found', 404);
    if (!plan.isActive) throw new AppError('Plan is currently inactive', 400);
    if (amount < plan.minimumInvestment || amount > plan.maximumInvestment) {
      throw new AppError(`Investment must be between ${plan.minimumInvestment} and ${plan.maximumInvestment}`, 400);
    }

    // Check wallet balance
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);
    if (wallet.balance < amount) throw new AppError('Insufficient balance', 400);

    // Deduct from wallet balance
    await WalletService.updateBalance(userId, -amount, 'investment', `Investment in ${plan.name} plan`);

    // Create investment record
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    const investment = new Investment({
      user: userId,
      plan: planId,
      amount,
      currency: 'USD',
      startDate: new Date(),
      endDate,
      totalROI: 0,
      status: 'active',
      planSnapshot: {
        name: plan.name,
        dailyROI: plan.dailyROI,
        duration: plan.duration,
        expectedProfit: plan.expectedProfit,
      },
    });
    await investment.save();

    // Log transaction (already done in updateBalance)

    return investment;
  }

  // Calculate daily ROI for all active investments (cron job)
  async calculateDailyROI() {
    const activeInvestments = await Investment.find({
      status: 'active',
      endDate: { $gt: new Date() },
    }).populate('plan');

    let totalProcessed = 0;
    for (const inv of activeInvestments) {
      try {
        const dailyRate = inv.planSnapshot.dailyROI / 100; // e.g., 0.5% => 0.005
        const dailyAmount = inv.amount * dailyRate;

        // Credit profit to wallet
        await WalletService.updateBalance(
          inv.user,
          dailyAmount,
          'profit',
          `Daily ROI from ${inv.planSnapshot.name} investment #${inv._id}`
        );

        // Update investment totalROI
        inv.totalROI += dailyAmount;
        inv.roiCredits.push({ date: new Date(), amount: dailyAmount });
        await inv.save();

        totalProcessed++;
      } catch (error) {
        logger.error(`ROI calculation failed for investment ${inv._id}: ${error.message}`);
      }
    }

    // Check for completed investments
    const completedInvestments = await Investment.find({
      status: 'active',
      endDate: { $lte: new Date() },
    });
    for (const inv of completedInvestments) {
      inv.status = 'completed';
      inv.completedAt = new Date();
      await inv.save();
    }

    logger.info(`ROI calculated for ${totalProcessed} investments`);
    return { processed: totalProcessed, completed: completedInvestments.length };
  }

  // Get user investments
  async getUserInvestments(userId) {
    return await Investment.find({ user: userId })
      .populate('plan', 'name color badge')
      .sort({ createdAt: -1 });
  }

  // Get investment details
  async getInvestment(investmentId) {
    return await Investment.findById(investmentId).populate('plan');
  }

  // Cancel investment (admin)
  async cancelInvestment(investmentId, adminId) {
    const investment = await Investment.findById(investmentId);
    if (!investment) throw new AppError('Investment not found', 404);
    if (investment.status !== 'active') throw new AppError('Investment is not active', 400);

    investment.status = 'cancelled';
    await investment.save();

    // Refund remaining balance (not yet earned)
    // For simplicity, we refund the original amount minus any ROI credited so far
    // But we need to calculate remaining principal. We'll just refund the original amount.
    // In real scenario, you'd compute remaining principal.
    const refundAmount = investment.amount;
    await WalletService.updateBalance(
      investment.user,
      refundAmount,
      'bonus',
      `Investment cancellation refund for #${investment._id}`
    );
    return investment;
  }
}

module.exports = new InvestmentService();
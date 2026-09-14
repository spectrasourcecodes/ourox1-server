const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    cryptoCurrency: {
      type: String,
      enum: ['BTC', 'ETH', 'USDT', 'BNB', 'TRX', ''],
      default: '',
    },
    cryptoAmount: {
      type: Number,
      default: 0,
    },
    walletAddress: {
      type: String,
      required: true,
    },
    transactionHash: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reference: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    paidAt: Date,
    rejectionReason: String,
  },
  { timestamps: true }
);

// Keep only compound index if needed:
withdrawalSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
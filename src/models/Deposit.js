const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
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
      default: '',
    },
    transactionHash: {
      type: String,
      default: '',
    },
    proofImage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
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
    rejectionReason: String,
  },
  { timestamps: true }
);

// Keep only compound index if needed:
depositSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Deposit', depositSchema);
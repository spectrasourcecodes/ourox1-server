const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InvestmentPlan',
      required: true,
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
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalROI: {
      type: Number,
      default: 0,
    },
    lastROICalculation: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'pending_verification', 'active', 'completed', 'cancelled', 'paused'],
      default: 'pending',
      index: true,
    },
    planSnapshot: {
      name: String,
      dailyROI: Number,
      duration: Number,
      expectedProfit: Number,
    },
    roiCredits: [
      {
        date: { type: Date, default: Date.now },
        amount: { type: Number, default: 0 },
      },
    ],
    completedAt: Date,
    // NEW FIELDS FOR PAYMENT & PROOF
    reference: {
      type: String,
      unique: true,
      trim: true,
    },
    proofImage: {
      type: String,
      default: '',
    },
    paymentDetails: {
      walletId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminWallet',
      },
      walletAddress: String,
      currency: String,
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Optional: track if payment was confirmed by admin
    paymentConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound indexes
investmentSchema.index({ user: 1, status: 1 });
investmentSchema.index({ endDate: 1 });
investmentSchema.index({ reference: 1 });

module.exports = mongoose.model('Investment', investmentSchema);
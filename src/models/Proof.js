const mongoose = require('mongoose');

const proofSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'investment'],
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
    proofImage: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'pending_verification', 'approved', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    // Track which deposit/investment this proof belongs to
    depositId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deposit',
    },
    investmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
    },
    // Admin who verified
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
    // Payment details snapshot
    paymentDetails: {
      walletId: mongoose.Schema.Types.ObjectId,
      walletAddress: String,
      currency: String,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
proofSchema.index({ user: 1, createdAt: -1 });
proofSchema.index({ status: 1, type: 1 });
proofSchema.index({ reference: 1 });
proofSchema.index({ userEmail: 1 });

module.exports = mongoose.model('Proof', proofSchema);
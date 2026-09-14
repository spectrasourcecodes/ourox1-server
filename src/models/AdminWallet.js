const mongoose = require('mongoose');

const adminWalletSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['crypto', 'pix', 'bank', 'mobile_money'],
      required: true,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    // Additional fields for specific payment methods
    details: {
      // For PIX: key type, name
      // For Bank: bank name, account number, routing number
      // For Crypto: network (ERC20, BEP20, etc.)
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    // For QR code or logo
    imageUrl: {
      type: String,
      default: '',
    },
    // Order for display
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
adminWalletSchema.index({ type: 1, currency: 1 });
adminWalletSchema.index({ isActive: 1 });

module.exports = mongoose.model('AdminWallet', adminWalletSchema);
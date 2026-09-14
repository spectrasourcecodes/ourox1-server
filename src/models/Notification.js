const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'deposit', 'withdrawal', 'investment', 'kyc', 'referral'],
      default: 'info',
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // For push notifications
    sentPush: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
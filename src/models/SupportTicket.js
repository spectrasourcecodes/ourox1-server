const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['deposit', 'withdrawal', 'investment', 'account', 'kyc', 'referral', 'other'],
      default: 'other',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    responses: [
      {
        message: { type: String, required: true },
        sender: {
          type: String,
          enum: ['user', 'admin'],
          required: true,
        },
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'senderModel',
        },
        senderModel: {
          type: String,
          enum: ['User', 'Admin'],
        },
        createdAt: { type: Date, default: Date.now },
        attachments: [String],
      },
    ],
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
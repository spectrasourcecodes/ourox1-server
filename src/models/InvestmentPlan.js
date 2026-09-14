const mongoose = require('mongoose');

const investmentPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ['Starter', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Platinum', 'VIP'],
      unique: true,
    },
    minimumInvestment: {
      type: Number,
      required: true,
      min: 0,
    },
    maximumInvestment: {
      type: Number,
      required: true,
      min: 0,
    },
    dailyROI: {
      type: Number, // e.g., 0.5 for 0.5% daily
      required: true,
      min: 0,
    },
    duration: {
      type: Number, // in days
      required: true,
      min: 1,
    },
    expectedProfit: {
      type: Number, // total profit percentage (e.g., 15% of investment)
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    features: {
      type: [String],
      default: [],
    },
    // color theme for UI
    color: {
      type: String,
      default: '#2563EB',
    },
    // badge text (e.g., "Popular", "Best Value")
    badge: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InvestmentPlan', investmentPlanSchema);
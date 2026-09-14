const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const Wallet = require('../models/Wallet');        
const Transaction = require('../models/Transaction'); 
const walletService = require('../services/walletService');

exports.getWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWallet(req.user._id, req.user.currency);
  res.json({ success: true, data: wallet });
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const transactions = await Transaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
  const total = await Transaction.countDocuments({ user: req.user._id });
  res.json({
    success: true,
    data: transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});
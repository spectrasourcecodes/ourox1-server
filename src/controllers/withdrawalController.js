const { asyncHandler } = require('../utils/asyncHandler');
const walletService = require('../services/walletService');
const Withdrawal = require('../models/Withdrawal');
const Wallet = require('../models/Wallet');
const KYC = require('../models/KYC');
const AppError = require('../utils/appError');

exports.requestWithdrawal = asyncHandler(async (req, res) => {
  const { amount, cryptoCurrency, walletAddress } = req.body;
  // Check KYC status
  const kyc = await KYC.findOne({ user: req.user._id });
  const kycStatus = kyc ? kyc.status : 'pending';
  const withdrawal = await walletService.requestWithdrawal(
    req.user._id,
    amount,
    cryptoCurrency,
    walletAddress,
    kycStatus
  );
  res.status(201).json({ success: true, data: withdrawal });
});

exports.getWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: withdrawals });
});
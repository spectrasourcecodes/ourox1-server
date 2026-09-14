const { asyncHandler } = require('../utils/asyncHandler');
const walletService = require('../services/walletService');
const Wallet = require('../models/Wallet');        // ✅ Add
const Deposit = require('../models/Deposit');
const AppError = require('../utils/appError');
const { v4: uuidv4 } = require('uuid');

exports.createDeposit = asyncHandler(async (req, res) => {
  const { amount, cryptoCurrency } = req.body;
  // Get wallet address from settings or admin
  // For now, we fetch from wallet's cryptoAddresses
  const wallet = await Wallet.findOne({ user: req.user._id });
  const address = wallet.cryptoAddresses[cryptoCurrency] || '';
  if (!address) throw new AppError('Crypto address not configured', 400);

  const deposit = await walletService.recordDeposit(
    req.user._id,
    amount,
    cryptoCurrency,
    address,
    '' // proof image will be uploaded later
  );
  res.status(201).json({ success: true, data: deposit });
});

exports.uploadProof = asyncHandler(async (req, res) => {
  const { depositId } = req.params;
  const { proofImage } = req.body;
  const deposit = await Deposit.findById(depositId);
  if (!deposit) throw new AppError('Deposit not found', 404);
  if (deposit.user.toString() !== req.user._id.toString()) {
    throw new AppError('Unauthorized', 403);
  }
  deposit.proofImage = proofImage;
  await deposit.save();
  res.json({ success: true, data: deposit });
});

exports.getDeposits = asyncHandler(async (req, res) => {
  const deposits = await Deposit.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: deposits });
});
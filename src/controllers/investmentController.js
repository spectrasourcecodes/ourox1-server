const Investment = require('../models/Investment');
const InvestmentPlan = require('../models/InvestmentPlan');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const AdminWallet = require('../models/AdminWallet');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// ============================================================
// GET ALL PLANS
// ============================================================
exports.getPlans = asyncHandler(async (req, res) => {
  const plans = await InvestmentPlan.find({ isActive: true });
  res.json({ success: true, data: plans });
});

// ============================================================
// GET USER INVESTMENTS
// ============================================================
exports.getInvestments = asyncHandler(async (req, res) => {
  const investments = await Investment.find({ user: req.user._id })
    .populate('plan', 'name dailyROI duration expectedProfit')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: investments });
});

// ============================================================
// GET SINGLE INVESTMENT
// ============================================================
exports.getInvestment = asyncHandler(async (req, res) => {
  const investment = await Investment.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate('plan', 'name dailyROI duration expectedProfit');
  if (!investment) throw new AppError('Investment not found', 404);
  res.json({ success: true, data: investment });
});

// ============================================================
// CREATE INVESTMENT (PENDING)
// ============================================================
exports.createInvestment = asyncHandler(async (req, res) => {
  const { planId, amount, walletId, walletAddress } = req.body;

  // Validate plan
  const plan = await InvestmentPlan.findById(planId);
  if (!plan) throw new AppError('Plan not found', 404);
  if (!plan.isActive) throw new AppError('Plan is currently inactive', 400);
  if (amount < plan.minimumInvestment || amount > plan.maximumInvestment) {
    throw new AppError(`Amount must be between $${plan.minimumInvestment} and $${plan.maximumInvestment}`, 400);
  }

  // Validate wallet
  const adminWallet = await AdminWallet.findById(walletId);
  if (!adminWallet || !adminWallet.isActive) {
    throw new AppError('Selected payment method is not available', 400);
  }

  // Create investment record (pending)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.duration);

  const investment = await Investment.create({
    user: req.user._id,
    plan: planId,
    amount,
    currency: 'USD',
    startDate: new Date(),
    endDate,
    status: 'pending',
    planSnapshot: {
      name: plan.name,
      dailyROI: plan.dailyROI,
      duration: plan.duration,
      expectedProfit: plan.expectedProfit,
    },
    paymentDetails: {
      walletId: adminWallet._id,
      walletAddress: adminWallet.address,
      currency: adminWallet.currency,
    },
    reference: `INV-${uuidv4().slice(0, 8).toUpperCase()}`,
  });

  // ✅ CREATE TRANSACTION for this investment
  await Transaction.create({
    user: req.user._id,
    type: 'investment',
    amount: amount,
    currency: 'USD',
    status: 'pending',
    reference: investment.reference,
    description: `Investment in ${plan.name} (Pending)`,
    investmentId: investment._id,
  });

  res.status(201).json({
    success: true,
    data: {
      investment,
      reference: investment.reference,
    },
  });
});

// ============================================================
// PURCHASE PLAN (LEGACY - DIRECT PURCHASE)
// ============================================================
exports.purchasePlan = asyncHandler(async (req, res) => {
  const { planId, amount } = req.body;

  const plan = await InvestmentPlan.findById(planId);
  if (!plan) throw new AppError('Plan not found', 404);
  if (!plan.isActive) throw new AppError('Plan is currently inactive', 400);

  // Check wallet balance
  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) throw new AppError('Wallet not found', 404);
  if (wallet.balance < amount) throw new AppError('Insufficient balance', 400);

  // Deduct from wallet
  wallet.balance -= amount;
  await wallet.save();

  // Create investment
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.duration);

  const investment = await Investment.create({
    user: req.user._id,
    plan: planId,
    amount,
    currency: 'USD',
    startDate: new Date(),
    endDate,
    status: 'active',
    planSnapshot: {
      name: plan.name,
      dailyROI: plan.dailyROI,
      duration: plan.duration,
      expectedProfit: plan.expectedProfit,
    },
  });

  // Log transaction
  await Transaction.create({
    user: req.user._id,
    type: 'investment',
    amount,
    currency: 'USD',
    status: 'completed',
    reference: `INV-${uuidv4().slice(0, 8).toUpperCase()}`,
    description: `Investment in ${plan.name}`,
    investmentId: investment._id,
  });

  res.status(201).json({
    success: true,
    data: investment,
  });
});

// ============================================================
// UPLOAD PROOF
// ============================================================
// Or we can use base64 approach (simpler, no multer needed)
// We'll use base64 for simplicity
exports.uploadProof = asyncHandler(async (req, res) => {
  const { proofImage } = req.body;

  if (!proofImage) {
    throw new AppError('Proof image is required', 400);
  }

  const investment = await Investment.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!investment) {
    throw new AppError('Investment not found', 404);
  }

  if (!['pending', 'pending_verification'].includes(investment.status)) {
    throw new AppError('Investment is not awaiting verification', 400);
  }

  // Save proof image and update status
  investment.proofImage = proofImage;
  investment.status = 'pending_verification';
  await investment.save();

  // ✅ Update transaction status
  await Transaction.findOneAndUpdate(
    { investmentId: investment._id },
    { status: 'pending_verification' }
  );

  res.json({
    success: true,
    message: 'Proof uploaded successfully. Your investment is pending review.',
  });
});
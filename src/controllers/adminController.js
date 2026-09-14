const { asyncHandler } = require('../utils/asyncHandler');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const Proof = require('../models/Proof');
const Investment = require('../models/Investment');
const InvestmentPlan = require('../models/InvestmentPlan');
const KYC = require('../models/KYC');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/appError');
const walletService = require('../services/walletService');
const investmentService = require('../services/investmentService');
const kycService = require('../services/kycService');
const { v4: uuidv4 } = require('uuid');

// ---------- User Management ----------
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { referralCode: { $regex: search, $options: 'i' } },
    ];
  }
  const users = await User.find(query)
    .select('-password')
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });
  const total = await User.countDocuments(query);
  res.json({
    success: true,
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new AppError('User not found', 404);
  const wallet = await Wallet.findOne({ user: user._id });
  const kyc = await KYC.findOne({ user: user._id });
  res.json({ success: true, data: { user, wallet, kyc } });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const { fullName, email, phone, country, currency, isActive, isVerified } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (country) user.country = country;
  if (currency) user.currency = currency;
  if (isActive !== undefined) user.isActive = isActive;
  if (isVerified !== undefined) user.isVerified = isVerified;
  await user.save();
  res.json({ success: true, data: user });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  await user.remove();
  res.json({ success: true, message: 'User deleted' });
});

exports.resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password reset successfully' });
});

exports.changeUserBalance = asyncHandler(async (req, res) => {
  const { amount, type } = req.body; // type: 'balance', 'profit', 'referral'
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  const wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) throw new AppError('Wallet not found', 404);
  const field = type === 'profit' ? 'profitBalance' : type === 'referral' ? 'referralBalance' : 'balance';
  wallet[field] += amount;
  await wallet.save();
  res.json({ success: true, data: wallet });
});

// ---------- Deposit Management ----------
exports.getDeposits = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  const deposits = await Deposit.find(query)
    .populate('user', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
  const total = await Deposit.countDocuments(query);
  res.json({
    success: true,
    data: deposits,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.approveDeposit = asyncHandler(async (req, res) => {
  const deposit = await walletService.approveDeposit(req.params.id, req.user._id);
  res.json({ success: true, data: deposit });
});

exports.rejectDeposit = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const deposit = await Deposit.findById(req.params.id);
  if (!deposit) throw new AppError('Deposit not found', 404);
  if (deposit.status !== 'pending') throw new AppError('Deposit already processed', 400);
  deposit.status = 'rejected';
  deposit.rejectionReason = reason || 'Not provided';
  deposit.approvedBy = req.user._id;
  deposit.approvedAt = new Date();
  await deposit.save();
  res.json({ success: true, data: deposit });
});

// ---------- Withdrawal Management ----------
exports.getWithdrawals = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  const withdrawals = await Withdrawal.find(query)
    .populate('user', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
  const total = await Withdrawal.countDocuments(query);
  res.json({
    success: true,
    data: withdrawals,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.approveWithdrawal = asyncHandler(async (req, res) => {
  const withdrawal = await walletService.approveWithdrawal(req.params.id, req.user._id);
  res.json({ success: true, data: withdrawal });
});

exports.rejectWithdrawal = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal) throw new AppError('Withdrawal not found', 404);
  if (withdrawal.status !== 'pending') throw new AppError('Withdrawal already processed', 400);
  withdrawal.status = 'rejected';
  withdrawal.rejectionReason = reason || 'Not provided';
  withdrawal.approvedBy = req.user._id;
  withdrawal.approvedAt = new Date();
  await withdrawal.save();
  res.json({ success: true, data: withdrawal });
});

exports.markWithdrawalPaid = asyncHandler(async (req, res) => {
  const { transactionHash } = req.body;
  const withdrawal = await walletService.markWithdrawalPaid(req.params.id, transactionHash);
  res.json({ success: true, data: withdrawal });
});

// ---------- KYC Management ----------
exports.getKYCRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  const kycs = await KYC.find(query)
    .populate('user', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
  const total = await KYC.countDocuments(query);
  res.json({
    success: true,
    data: kycs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.approveKYC = asyncHandler(async (req, res) => {
  const kyc = await kycService.approveKYC(req.params.id, req.user._id);
  res.json({ success: true, data: kyc });
});

exports.rejectKYC = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const kyc = await kycService.rejectKYC(req.params.id, req.user._id, reason);
  res.json({ success: true, data: kyc });
});

// ---------- Investment Plans ----------
exports.getInvestmentPlans = asyncHandler(async (req, res) => {
  const plans = await InvestmentPlan.find();
  res.json({ success: true, data: plans });
});

exports.createInvestmentPlan = asyncHandler(async (req, res) => {
  const plan = new InvestmentPlan(req.body);
  await plan.save();
  res.status(201).json({ success: true, data: plan });
});

exports.updateInvestmentPlan = asyncHandler(async (req, res) => {
  const plan = await InvestmentPlan.findById(req.params.id);
  if (!plan) throw new AppError('Plan not found', 404);
  Object.assign(plan, req.body);
  await plan.save();
  res.json({ success: true, data: plan });
});

exports.deleteInvestmentPlan = asyncHandler(async (req, res) => {
  const plan = await InvestmentPlan.findById(req.params.id);
  if (!plan) throw new AppError('Plan not found', 404);
  await plan.remove();
  res.json({ success: true, message: 'Plan deleted' });
});

// ---------- Reports ----------
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const totalDeposits = await Deposit.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
  const totalWithdrawals = await Withdrawal.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
  const totalInvestments = await Investment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
  const pendingKYCs = await KYC.countDocuments({ status: 'pending' });
  const pendingDeposits = await Deposit.countDocuments({ status: 'pending' });
  const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      totalDeposits: totalDeposits[0]?.total || 0,
      totalWithdrawals: totalWithdrawals[0]?.total || 0,
      totalInvestments: totalInvestments[0]?.total || 0,
      pendingKYCs,
      pendingDeposits,
      pendingWithdrawals,
    },
  });
});

// ---------- Audit Logs ----------
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const logs = await AuditLog.find()
    .populate('user', 'fullName email')
    .populate('admin', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
  const total = await AuditLog.countDocuments();
  res.json({
    success: true,
    data: logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ---------- Settings ----------
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.find();
  res.json({ success: true, data: settings });
});

exports.updateSetting = asyncHandler(async (req, res) => {
  const { key, value } = req.body;
  const setting = await Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
  res.json({ success: true, data: setting });
});



// ============================================================
// ADMIN WALLET CONTROLLERS
// ============================================================

// Get all admin wallets
exports.getAdminWallets = asyncHandler(async (req, res) => {
  const AdminWallet = require('../models/AdminWallet');
  const { type } = req.query;
  const filter = { isActive: true };
  if (type) filter.type = type;
  const wallets = await AdminWallet.find(filter).sort({ order: 1 });
  res.json({ success: true, data: wallets });
});

// Get single admin wallet
exports.getAdminWalletById = asyncHandler(async (req, res) => {
  const AdminWallet = require('../models/AdminWallet');
  const wallet = await AdminWallet.findById(req.params.id);
  if (!wallet) throw new AppError('Wallet not found', 404);
  res.json({ success: true, data: wallet });
});

// Create admin wallet
exports.createAdminWallet = asyncHandler(async (req, res) => {
  const AdminWallet = require('../models/AdminWallet');
  const wallet = new AdminWallet(req.body);
  await wallet.save();
  res.status(201).json({ success: true, data: wallet });
});

// Update admin wallet
exports.updateAdminWallet = asyncHandler(async (req, res) => {
  const AdminWallet = require('../models/AdminWallet');
  const wallet = await AdminWallet.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!wallet) throw new AppError('Wallet not found', 404);
  res.json({ success: true, data: wallet });
});

// Delete admin wallet
exports.deleteAdminWallet = asyncHandler(async (req, res) => {
  const AdminWallet = require('../models/AdminWallet');
  const wallet = await AdminWallet.findByIdAndDelete(req.params.id);
  if (!wallet) throw new AppError('Wallet not found', 404);
  res.json({ success: true, message: 'Wallet deleted' });
});

// Toggle admin wallet active status
exports.toggleAdminWalletStatus = asyncHandler(async (req, res) => {
  const AdminWallet = require('../models/AdminWallet');
  const wallet = await AdminWallet.findById(req.params.id);
  if (!wallet) throw new AppError('Wallet not found', 404);
  wallet.isActive = !wallet.isActive;
  await wallet.save();
  res.json({ success: true, data: wallet });
});


// ============================================================
// USER WALLET MANAGEMENT (Admin)
// ============================================================

// Get user wallet
exports.getUserWallet = asyncHandler(async (req, res) => {
  const Wallet = require('../models/Wallet');
  const wallet = await Wallet.findOne({ user: req.params.id });
  if (!wallet) {
    throw new AppError('Wallet not found for this user', 404);
  }
  res.json({ success: true, data: wallet });
});

// Create user wallet (if not exists)
exports.createUserWallet = asyncHandler(async (req, res) => {
  const Wallet = require('../models/Wallet');
  let wallet = await Wallet.findOne({ user: req.params.id });
  if (wallet) {
    return res.json({ success: true, data: wallet, message: 'Wallet already exists' });
  }
  wallet = await Wallet.create({
    user: req.params.id,
    balance: 0,
    profitBalance: 0,
    referralBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
  });
  res.status(201).json({ success: true, data: wallet });
});

// Update user wallet (balance, profitBalance, referralBalance)
exports.updateUserWallet = asyncHandler(async (req, res) => {
  const Wallet = require('../models/Wallet');
  const { balance, profitBalance, referralBalance, totalDeposits, totalWithdrawals } = req.body;
  
  const wallet = await Wallet.findOne({ user: req.params.id });
  if (!wallet) {
    throw new AppError('Wallet not found for this user', 404);
  }

  // Update only provided fields
  if (balance !== undefined) wallet.balance = balance;
  if (profitBalance !== undefined) wallet.profitBalance = profitBalance;
  if (referralBalance !== undefined) wallet.referralBalance = referralBalance;
  if (totalDeposits !== undefined) wallet.totalDeposits = totalDeposits;
  if (totalWithdrawals !== undefined) wallet.totalWithdrawals = totalWithdrawals;

  await wallet.save();
  res.json({ success: true, data: wallet });
});

// ============================================================
// TRANSACTION MANAGEMENT (Admin)
// ============================================================

// Get all transactions with filters and pagination
exports.getAdminTransactions = asyncHandler(async (req, res) => {
  const Transaction = require('../models/Transaction');
  const { page = 1, limit = 20, type, status, search } = req.query;
  
  const query = {};
  if (type) query.type = type;
  if (status) query.status = status;
  
  // Search by user name or reference
  if (search) {
    const users = await User.find({
      $or: [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    const userIds = users.map(u => u._id);
    query.$or = [
      { user: { $in: userIds } },
      { reference: { $regex: search, $options: 'i' } }
    ];
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .populate('user', 'fullName email name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Transaction.countDocuments(query)
  ]);
  
  res.json({
    success: true,
    data: transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get single transaction by ID
exports.getAdminTransactionById = asyncHandler(async (req, res) => {
  const Transaction = require('../models/Transaction');
  const transaction = await Transaction.findById(req.params.id)
    .populate('user', 'fullName email name phone');
  
  if (!transaction) {
    throw new AppError('Transaction not found', 404);
  }
  
  res.json({ success: true, data: transaction });
});

// ============================================================
// PAYMENT PROOFS (Admin) - Using Proof Model
// ============================================================

// Get all payment proofs with filters and pagination
exports.getPaymentProofs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, type, search } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  // Search by user email or reference
  if (search) {
    filter.$or = [
      { userEmail: { $regex: search, $options: 'i' } },
      { reference: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [proofs, total] = await Promise.all([
    Proof.find(filter)
      .populate('user', 'fullName email name phone')
      .populate('verifiedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Proof.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: proofs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single payment proof by ID
exports.getPaymentProofById = asyncHandler(async (req, res) => {
  const proof = await Proof.findById(req.params.id)
    .populate('user', 'fullName email name phone')
    .populate('verifiedBy', 'fullName email');

  if (!proof) {
    throw new AppError('Payment proof not found', 404);
  }

  res.json({ success: true, data: proof });
});

// Approve payment proof
exports.approvePaymentProof = asyncHandler(async (req, res) => {
  const proof = await Proof.findById(req.params.id);

  if (!proof) {
    throw new AppError('Payment proof not found', 404);
  }

  if (proof.status === 'approved' || proof.status === 'verified') {
    throw new AppError('This proof has already been approved', 400);
  }

  // Update proof status
  proof.status = 'approved';
  proof.verifiedBy = req.user._id;
  proof.verifiedAt = new Date();
  await proof.save();

  // If it's a deposit, credit the user's wallet
  if (proof.type === 'deposit') {
    const wallet = await Wallet.findOne({ user: proof.user });
    if (wallet) {
      wallet.balance = (wallet.balance || 0) + proof.amount;
      wallet.totalDeposits = (wallet.totalDeposits || 0) + proof.amount;
      await wallet.save();
    }

    // Also update the associated deposit if exists
    if (proof.depositId) {
      const Deposit = require('../models/Deposit');
      await Deposit.findByIdAndUpdate(proof.depositId, {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      });
    }
  }

  // If it's an investment, activate it
  if (proof.type === 'investment') {
    const Investment = require('../models/Investment');
    if (proof.investmentId) {
      const investment = await Investment.findById(proof.investmentId);
      if (investment && investment.status === 'pending') {
        investment.status = 'active';
        investment.startDate = new Date();
        const plan = await InvestmentPlan.findById(investment.plan);
        if (plan) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + plan.duration);
          investment.endDate = endDate;
        }
        await investment.save();
      }
    }
  }

  // Create transaction record
  await Transaction.create({
    user: proof.user,
    type: proof.type === 'deposit' ? 'deposit' : 'investment',
    amount: proof.amount,
    currency: proof.currency || 'USD',
    status: 'completed',
    reference: proof.reference || `PROOF-${proof._id.slice(-8)}`,
    description: `${proof.type === 'deposit' ? 'Deposit' : 'Investment'} approved via proof verification`,
  });

  res.json({
    success: true,
    message: 'Payment proof approved successfully',
    data: proof,
  });
});

// Reject payment proof
exports.rejectPaymentProof = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const proof = await Proof.findById(req.params.id);

  if (!proof) {
    throw new AppError('Payment proof not found', 404);
  }

  if (proof.status === 'rejected') {
    throw new AppError('This proof has already been rejected', 400);
  }

  proof.status = 'rejected';
  proof.rejectionReason = reason || 'Payment proof rejected by admin';
  proof.verifiedBy = req.user._id;
  proof.verifiedAt = new Date();
  await proof.save();

  // Update associated deposit/investment if exists
  if (proof.depositId) {
    const Deposit = require('../models/Deposit');
    await Deposit.findByIdAndUpdate(proof.depositId, {
      status: 'rejected',
      rejectionReason: reason || 'Payment proof rejected by admin',
      approvedBy: req.user._id,
      approvedAt: new Date(),
    });
  }

  if (proof.investmentId) {
    const Investment = require('../models/Investment');
    await Investment.findByIdAndUpdate(proof.investmentId, {
      status: 'cancelled',
      approvedBy: req.user._id,
      approvedAt: new Date(),
    });
  }

  res.json({
    success: true,
    message: 'Payment proof rejected',
    data: proof,
  });
});

// Create a new proof (for users to submit)
exports.createProof = asyncHandler(async (req, res) => {
  const { type, amount, proofImage, depositId, investmentId, description } = req.body;

  const proof = await Proof.create({
    user: req.user._id,
    userEmail: req.user.email,
    type,
    amount,
    currency: req.user.currency || 'USD',
    proofImage,
    reference: `${type.toUpperCase()}-${Date.now()}-${req.user._id.slice(-4)}`,
    description: description || '',
    depositId: depositId || null,
    investmentId: investmentId || null,
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    message: 'Proof submitted successfully',
    data: proof,
  });
});
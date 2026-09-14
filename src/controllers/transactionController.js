const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { generateReference } = require('../utils/helpers');

// @desc    Get all transactions for authenticated user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { user: req.user.id };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'username email')
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get a single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('user', 'username email');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats/summary
// @access  Private
const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
        },
      },
    ]);

    // Also get total balance summary
    const balanceSummary = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), status: 'completed' } },
      {
        $group: {
          _id: null,
          totalDeposits: {
            $sum: { $cond: [{ $eq: ['$type', 'deposit'] }, '$amount', 0] },
          },
          totalWithdrawals: {
            $sum: { $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0] },
          },
          totalProfits: {
            $sum: { $cond: [{ $eq: ['$type', 'profit'] }, '$amount', 0] },
          },
          totalReferrals: {
            $sum: { $cond: [{ $eq: ['$type', 'referral'] }, '$amount', 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byType: stats,
        summary: balanceSummary[0] || {
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalProfits: 0,
          totalReferrals: 0,
        },
      },
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const { type, amount, description, metadata, depositId, withdrawalId, investmentId } = req.body;

    // Validate required fields
    if (!type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Type and amount are required',
      });
    }

    // Generate unique reference
    const reference = generateReference('TXN');

    const transaction = await Transaction.create({
      user: req.user.id,
      type,
      amount,
      description: description || '',
      metadata: metadata || {},
      reference,
      status: 'pending',
      depositId,
      withdrawalId,
      investmentId,
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully',
    });
  } catch (error) {
    console.error('Create transaction error:', error);

    // Handle duplicate reference error
    if (error.code === 11000 && error.keyPattern?.reference) {
      return res.status(409).json({
        success: false,
        message: 'Transaction reference already exists. Please try again.',
      });
    }

    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update transaction status (admin only)
// @route   PATCH /api/transactions/:id/status
// @access  Private/Admin
const updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Check if user owns this transaction or is admin
    if (transaction.user.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    transaction.status = status;
    await transaction.save();

    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction status updated successfully',
    });
  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Cancel a pending transaction
// @route   PATCH /api/transactions/:id/cancel
// @access  Private
const cancelTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Only allow cancellation if status is 'pending'
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending transactions can be cancelled',
      });
    }

    transaction.status = 'cancelled';
    await transaction.save();

    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  getTransactionStats,
  createTransaction,
  updateTransactionStatus,
  cancelTransaction,
};
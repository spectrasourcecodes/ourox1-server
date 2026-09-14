const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middlewares/auth');

// All routes are protected (require authentication)
router.use(protect);

// Get all transactions for the authenticated user (with pagination)
router.get('/', transactionController.getTransactions);

// Get a single transaction by ID
router.get('/:id', transactionController.getTransactionById);

// Get transaction statistics (summary)
router.get('/stats/summary', transactionController.getTransactionStats);

// Create a new transaction
router.post('/', transactionController.createTransaction);

// Update transaction status (admin only - add admin middleware if needed)
router.patch('/:id/status', transactionController.updateTransactionStatus);

// Cancel a pending transaction
router.patch('/:id/cancel', transactionController.cancelTransaction);

module.exports = router;
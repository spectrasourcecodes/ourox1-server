const express = require('express');
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetUserPassword,
  changeUserBalance,
  getDeposits,
  approveDeposit,
  rejectDeposit,
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  markWithdrawalPaid,
  getKYCRequests,
  approveKYC,
  rejectKYC,
  getInvestmentPlans,
  createInvestmentPlan,
  updateInvestmentPlan,
  deleteInvestmentPlan,
  getDashboardStats,
  getAuditLogs,
  getSettings,
  updateSetting,
  // Admin Wallet Controllers
  getAdminWallets,
  getAdminWalletById,
  createAdminWallet,
  updateAdminWallet,
  deleteAdminWallet,
  toggleAdminWalletStatus,
  // User Wallet Controllers
  getUserWallet,
  createUserWallet,
  updateUserWallet,
  // Transaction Controllers
  getAdminTransactions,
  getAdminTransactionById,
  // Payment Proof Controllers
  getPaymentProofs,
  getPaymentProofById,
  approvePaymentProof,
  rejectPaymentProof,
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard
router.get('/stats', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);
router.post('/users/:id/balance', changeUserBalance);

// User Wallet Management
router.get('/users/:id/wallet', getUserWallet);
router.post('/users/:id/wallet', createUserWallet);
router.put('/users/:id/wallet', updateUserWallet);

// ============================================================
// TRANSACTIONS (Admin)
// ============================================================
router.get('/transactions', getAdminTransactions);
router.get('/transactions/:id', getAdminTransactionById);

// Deposits
router.get('/deposits', getDeposits);
router.post('/deposits/:id/approve', approveDeposit);
router.post('/deposits/:id/reject', rejectDeposit);

// Withdrawals
router.get('/withdrawals', getWithdrawals);
router.post('/withdrawals/:id/approve', approveWithdrawal);
router.post('/withdrawals/:id/reject', rejectWithdrawal);
router.post('/withdrawals/:id/mark-paid', markWithdrawalPaid);

// KYC
router.get('/kyc', getKYCRequests);
router.post('/kyc/:id/approve', approveKYC);
router.post('/kyc/:id/reject', rejectKYC);

// Investment Plans
router.get('/plans', getInvestmentPlans);
router.post('/plans', createInvestmentPlan);
router.put('/plans/:id', updateInvestmentPlan);
router.delete('/plans/:id', deleteInvestmentPlan);

// Admin Wallets (Payment Methods)
router.get('/wallets', getAdminWallets);
router.get('/wallets/:id', getAdminWalletById);
router.post('/wallets', createAdminWallet);
router.put('/wallets/:id', updateAdminWallet);
router.delete('/wallets/:id', deleteAdminWallet);
router.patch('/wallets/:id/toggle', toggleAdminWalletStatus);

// ============================================================
// PAYMENT PROOFS (Admin)
// ============================================================
router.get('/payment-proofs', getPaymentProofs);
router.get('/payment-proofs/:id', getPaymentProofById);
router.post('/payment-proofs/:id/approve', approvePaymentProof);
router.post('/payment-proofs/:id/reject', rejectPaymentProof);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSetting);

module.exports = router;
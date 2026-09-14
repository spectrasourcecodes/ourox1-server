const express = require('express');
const { protect, restrictTo } = require('../middlewares/auth');
const { 
  submitKYC, 
  getKYC, 
  uploadDocument,
  verifyKYC,
  getKYCStatus,
  getKYCSubmissions,
  approveKYC,
  rejectKYC,
} = require('../controllers/kycController');
const router = express.Router();

// User routes (authenticated)
router.use(protect);

// KYC submission and status (for users)
router.post('/', submitKYC);
router.get('/', getKYC);
router.get('/status', getKYCStatus);

// Document upload
router.post('/upload', uploadDocument);

// Verify with code (auto-verification)
router.post('/verify', verifyKYC);

// Admin routes
router.get('/submissions', restrictTo('admin'), getKYCSubmissions);
router.post('/:id/approve', restrictTo('admin'), approveKYC);
router.post('/:id/reject', restrictTo('admin'), rejectKYC);

module.exports = router;
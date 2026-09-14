const express = require('express');
const { protect } = require('../middlewares/auth');
const {
  getPlans,
  createInvestment,
  purchasePlan,
  getInvestments,
  getInvestment,
  uploadProof,
} = require('../controllers/investmentController');
const router = express.Router();

router.use(protect);

// Get all investment plans
router.get('/plans', getPlans);

// Get user's investments
router.get('/', getInvestments);

// Get single investment
router.get('/:id', getInvestment);

// Create a new investment (pending)
router.post('/', createInvestment);

// Purchase investment (direct purchase - legacy, may keep)
router.post('/purchase', purchasePlan);

// Upload proof of payment
router.post('/:id/upload-proof', uploadProof);

module.exports = router;
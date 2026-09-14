const express = require('express');
const { protect } = require('../middlewares/auth');
const { getReferralStats, getReferralLeaderboard } = require('../controllers/referralController');
const router = express.Router();

router.use(protect);
router.get('/stats', getReferralStats);
router.get('/leaderboard', getReferralLeaderboard);

module.exports = router;
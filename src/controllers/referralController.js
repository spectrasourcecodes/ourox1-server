const { asyncHandler } = require('../utils/asyncHandler');
const referralService = require('../services/referralService');

exports.getReferralStats = asyncHandler(async (req, res) => {
  const stats = await referralService.getReferralStats(req.user._id);
  res.json({ success: true, data: stats });
});

exports.getReferralLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await referralService.getLeaderboard(10);
  res.json({ success: true, data: leaderboard });
});
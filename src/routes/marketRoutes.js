const express = require('express');
const { protect } = require('../middlewares/auth');
const {
  getMarketData,
  getCoinDetails,
  searchCoins,
  getExchangeRates,
  getTrendingCoins,
  getTopGainers,
  getTopLosers,
} = require('../controllers/marketController');

const router = express.Router();

// Public routes (no auth required)
router.get('/prices', getMarketData);
router.get('/coins/:coinId', getCoinDetails);
router.get('/search', searchCoins);
router.get('/rates', getExchangeRates);
router.get('/trending', getTrendingCoins);
router.get('/gainers', getTopGainers);
router.get('/losers', getTopLosers);

// Protected if you want users to have favorites, etc.
router.use(protect);
// Add user-specific market routes later (favorites, alerts)

module.exports = router;
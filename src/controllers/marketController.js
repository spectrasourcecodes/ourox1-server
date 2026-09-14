const { asyncHandler } = require('../utils/asyncHandler');
const cryptoService = require('../services/cryptoService');
const currencyService = require('../services/currencyService');
const AppError = require('../utils/appError');

exports.getMarketData = asyncHandler(async (req, res) => {
  const { ids } = req.query;
  const data = await cryptoService.getMarketData(ids);
  res.json({ success: true, data });
});

exports.getCoinDetails = asyncHandler(async (req, res) => {
  const { coinId } = req.params;
  const data = await cryptoService.getCoin(coinId);
  if (!data) throw new AppError('Coin not found', 404);
  res.json({ success: true, data });
});

exports.searchCoins = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query) throw new AppError('Query parameter required', 400);
  const results = await cryptoService.searchCoins(query);
  res.json({ success: true, data: results });
});

exports.getExchangeRates = asyncHandler(async (req, res) => {
  const rates = await currencyService.getRates();
  res.json({ success: true, data: rates });
});

exports.getTrendingCoins = asyncHandler(async (req, res) => {
  // Could fetch from CoinGecko trending endpoint
  // For simplicity, we use our market data sorted by price change
  const data = await cryptoService.getMarketData();
  const trending = data.sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0)).slice(0, 5);
  res.json({ success: true, data: trending });
});

exports.getTopGainers = asyncHandler(async (req, res) => {
  const data = await cryptoService.getMarketData();
  const gainers = data
    .filter(c => (c.priceChange24h || 0) > 0)
    .sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0))
    .slice(0, 10);
  res.json({ success: true, data: gainers });
});

exports.getTopLosers = asyncHandler(async (req, res) => {
  const data = await cryptoService.getMarketData();
  const losers = data
    .filter(c => (c.priceChange24h || 0) < 0)
    .sort((a, b) => (a.priceChange24h || 0) - (b.priceChange24h || 0))
    .slice(0, 10);
  res.json({ success: true, data: losers });
});
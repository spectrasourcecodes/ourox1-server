const axios = require('axios');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const CACHE_KEY_PRICES = 'crypto_prices';
const COINGECKO_URL = 'https://api.coingecko.com/api/v3';

class CryptoService {
  // Get list of supported cryptocurrencies
  getSupportedCoins() {
    return ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano', 'dogecoin', 'ripple', 'toncoin', 'tron', 'chainlink'];
  }

  // Fetch live prices, 24h change, market cap, volume, sparkline
  async getMarketData(coinIds = null) {
    const ids = coinIds || this.getSupportedCoins().join(',');
    const cacheKey = `${CACHE_KEY_PRICES}_${ids}`;
    let data = cache.get(cacheKey);
    if (data) return data;

    try {
      const response = await axios.get(`${COINGECKO_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: ids,
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: true,
          price_change_percentage: '24h',
        },
        headers: {
          'x-cg-pro-api-key': process.env.COINGECKO_API_KEY,
        },
      });

      data = response.data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        volume: coin.total_volume,
        priceChange24h: coin.price_change_percentage_24h,
        sparkline: coin.sparkline_in_7d?.price || [],
        image: coin.image,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
      }));

      // Cache for 60 seconds (frequent updates)
      cache.set(cacheKey, data, 60);
      return data;
    } catch (error) {
      logger.error(`CryptoService market data error: ${error.message}`);
      throw new Error('Failed to fetch market data');
    }
  }

  // Get single coin by ID
  async getCoin(coinId) {
    const all = await this.getMarketData(coinId);
    return all.find(c => c.id === coinId) || null;
  }

  // Search coins (for autocomplete)
  async searchCoins(query) {
    try {
      const response = await axios.get(`${COINGECKO_URL}/search`, {
        params: { query },
        headers: {
          'x-cg-pro-api-key': process.env.COINGECKO_API_KEY,
        },
      });
      return response.data.coins.slice(0, 10);
    } catch (error) {
      logger.error(`CryptoService search error: ${error.message}`);
      return [];
    }
  }

  // Get historical chart data (candlestick) – using TradingView widget instead, so optional
}

module.exports = new CryptoService();
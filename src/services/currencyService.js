const axios = require('axios');
const cache = require('../utils/cache');
const Currency = require('../models/Currency');
const logger = require('../utils/logger');

const CACHE_KEY = 'exchange_rates';
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';

class CurrencyService {
  // Get exchange rate for a given currency code to USD
  async getRateToUSD(currencyCode) {
    const rates = await this.getRates();
    return rates[currencyCode.toUpperCase()] || 1;
  }

  // Get all rates with caching
  async getRates() {
    // Try cache first
    let rates = cache.get(CACHE_KEY);
    if (rates) return rates;

    try {
      // Fetch from CoinGecko using USD as base
      const response = await axios.get(COINGECKO_URL, {
        params: {
          ids: 'usd',
          vs_currencies: this.getSupportedCurrencyCodes().join(','),
        },
        headers: {
          'x-cg-pro-api-key': process.env.COINGECKO_API_KEY,
        },
      });

      // Transform response: { "usd": { "eur": 0.92, "gbp": 0.79, ... } }
      const data = response.data.usd;
      rates = {};
      for (const [code, rate] of Object.entries(data)) {
        rates[code.toUpperCase()] = rate;
      }
      // Ensure USD = 1
      rates.USD = 1;

      // Update database (optional, but good for fallback)
      for (const [code, rate] of Object.entries(rates)) {
        await Currency.findOneAndUpdate(
          { code: code.toUpperCase() },
          { rateToUSD: rate, lastUpdated: new Date() },
          { upsert: true }
        );
      }

      // Cache for 5 minutes (or use CACHE_TTL)
      cache.set(CACHE_KEY, rates, 300); // 5 minutes
      return rates;
    } catch (error) {
      logger.error(`CurrencyService fetch error: ${error.message}`);
      // Fallback to database
      const currencies = await Currency.find({ isActive: true });
      rates = {};
      currencies.forEach(c => { rates[c.code] = c.rateToUSD; });
      if (Object.keys(rates).length === 0) {
        rates = { USD: 1 }; // ultimate fallback
      }
      return rates;
    }
  }

  getSupportedCurrencyCodes() {
    // Should match the enum in User model
    return ['USD', 'EUR', 'GBP', 'NGN', 'BRL', 'CAD', 'AUD', 'JPY', 'CHF', 'AED', 'SAR', 'INR', 'PKR', 'KES', 'GHS', 'ZAR'];
  }

  // Convert amount from USD to user's currency
  async convertFromUSD(amountUSD, targetCurrency) {
    if (targetCurrency === 'USD' || !targetCurrency) return amountUSD;
    const rate = await this.getRateToUSD(targetCurrency);
    return amountUSD * rate;
  }

  // Convert from user's currency to USD
  async convertToUSD(amount, sourceCurrency) {
    if (sourceCurrency === 'USD' || !sourceCurrency) return amount;
    const rate = await this.getRateToUSD(sourceCurrency);
    return amount / rate;
  }
}

module.exports = new CurrencyService();
// utils/countryCurrencyMap.js
// Minimal country → currency map (mirrors the frontend data/countries.js)
// Used to auto-sync a user's currency when they change their country.

const COUNTRY_CURRENCY_MAP = {
  // Latin America
  'brazil':        { currency: 'BRL', symbol: 'R$' },
  'argentina':     { currency: 'ARS', symbol: '$' },
  'bolivia':       { currency: 'BOB', symbol: 'Bs' },
  'chile':         { currency: 'CLP', symbol: '$' },
  'colombia':      { currency: 'COP', symbol: '$' },
  'costa rica':    { currency: 'CRC', symbol: '₡' },
  'cuba':          { currency: 'CUP', symbol: '$' },
  'dominican republic': { currency: 'DOP', symbol: 'RD$' },
  'ecuador':       { currency: 'USD', symbol: '$' },
  'el salvador':   { currency: 'USD', symbol: '$' },
  'guatemala':     { currency: 'GTQ', symbol: 'Q' },
  'honduras':      { currency: 'HNL', symbol: 'L' },
  'mexico':        { currency: 'MXN', symbol: '$' },
  'nicaragua':     { currency: 'NIO', symbol: 'C$' },
  'panama':        { currency: 'PAB', symbol: 'B/.' },
  'paraguay':      { currency: 'PYG', symbol: '₲' },
  'peru':          { currency: 'PEN', symbol: 'S/' },
  'puerto rico':   { currency: 'USD', symbol: '$' },
  'uruguay':       { currency: 'UYU', symbol: '$U' },
  'venezuela':     { currency: 'VES', symbol: 'Bs' },

  // North America
  'united states': { currency: 'USD', symbol: '$' },
  'usa':           { currency: 'USD', symbol: '$' },
  'us':            { currency: 'USD', symbol: '$' },
  'canada':        { currency: 'CAD', symbol: 'C$' },

  // Europe
  'united kingdom': { currency: 'GBP', symbol: '£' },
  'uk':            { currency: 'GBP', symbol: '£' },
  'gb':            { currency: 'GBP', symbol: '£' },
  'germany':       { currency: 'EUR', symbol: '€' },
  'france':        { currency: 'EUR', symbol: '€' },
  'italy':         { currency: 'EUR', symbol: '€' },
  'spain':         { currency: 'EUR', symbol: '€' },
  'portugal':      { currency: 'EUR', symbol: '€' },
  'netherlands':   { currency: 'EUR', symbol: '€' },
  'belgium':       { currency: 'EUR', symbol: '€' },
  'ireland':       { currency: 'EUR', symbol: '€' },
  'finland':       { currency: 'EUR', symbol: '€' },
  'switzerland':   { currency: 'CHF', symbol: 'Fr' },
  'sweden':        { currency: 'SEK', symbol: 'kr' },
  'norway':        { currency: 'NOK', symbol: 'kr' },
  'denmark':       { currency: 'DKK', symbol: 'kr' },
  'poland':        { currency: 'PLN', symbol: 'zł' },
  'ukraine':       { currency: 'UAH', symbol: '₴' },
  'russia':        { currency: 'RUB', symbol: '₽' },
  'turkey':        { currency: 'TRY', symbol: '₺' },

  // Asia
  'japan':         { currency: 'JPY', symbol: '¥' },
  'china':         { currency: 'CNY', symbol: '¥' },
  'india':         { currency: 'INR', symbol: '₹' },
  'singapore':     { currency: 'SGD', symbol: 'S$' },
  'malaysia':      { currency: 'MYR', symbol: 'RM' },
  'thailand':      { currency: 'THB', symbol: '฿' },
  'vietnam':       { currency: 'VND', symbol: '₫' },
  'indonesia':     { currency: 'IDR', symbol: 'Rp' },
  'philippines':   { currency: 'PHP', symbol: '₱' },
  'pakistan':      { currency: 'PKR', symbol: '₨' },
  'south korea':   { currency: 'KRW', symbol: '₩' },

  // Africa
  'nigeria':       { currency: 'NGN', symbol: '₦' },
  'ng':            { currency: 'NGN', symbol: '₦' },
  'south africa':  { currency: 'ZAR', symbol: 'R' },
  'kenya':         { currency: 'KES', symbol: 'KSh' },
  'ghana':         { currency: 'GHS', symbol: '₵' },
  'algeria':       { currency: 'DZD', symbol: 'د.ج' },
  'dz':            { currency: 'DZD', symbol: 'د.ج' },
  'angola':        { currency: 'AOA', symbol: 'Kz' },
  'mozambique':    { currency: 'MZN', symbol: 'MT' },
  'cape verde':    { currency: 'CVE', symbol: '$' },

  // Oceania
  'australia':     { currency: 'AUD', symbol: 'A$' },
  'new zealand':   { currency: 'NZD', symbol: 'NZ$' },
};

/**
 * Resolve a currency from a country value (name or code).
 * @param {string} countryValue
 * @returns {{ currency: string, symbol: string } | null}
 */
const getCurrencyFromCountry = (countryValue) => {
  if (!countryValue) return null;
  const key = String(countryValue).trim().toLowerCase();
  return COUNTRY_CURRENCY_MAP[key] || null;
};

module.exports = { COUNTRY_CURRENCY_MAP, getCurrencyFromCountry };
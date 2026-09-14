const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique reference
 */
const generateReference = (prefix = 'TX') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Format currency
 */
const formatCurrency = (amount, currencySymbol = '$') => {
  return `${currencySymbol}${amount.toFixed(2)}`;
};

/**
 * Calculate percentage
 */
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

module.exports = {
  generateReference,
  formatCurrency,
  calculatePercentage,
};
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again later.',
});

module.exports = { authLimiter };
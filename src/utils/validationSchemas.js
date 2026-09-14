const { body, validationResult } = require('express-validator');
const AppError = require('./appError');

exports.validateRegister = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('country').notEmpty().withMessage('Country is required'),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'NGN', 'BRL', 'CAD', 'AUD', 'JPY', 'CHF', 'AED', 'SAR', 'INR', 'PKR', 'KES', 'GHS', 'ZAR']),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('referralCode').optional().isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }
    next();
  },
];

exports.validateLogin = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }
    next();
  },
];
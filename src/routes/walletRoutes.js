const express = require('express');
const { protect } = require('../middlewares/auth');
const { getWallet, getTransactions } = require('../controllers/walletController');
const router = express.Router();

router.use(protect);
router.get('/', getWallet);
router.get('/transactions', getTransactions);

module.exports = router;
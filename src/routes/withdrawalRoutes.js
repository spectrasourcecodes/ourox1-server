const express = require('express');
const { protect } = require('../middlewares/auth');
const { requestWithdrawal, getWithdrawals } = require('../controllers/withdrawalController');
const router = express.Router();

router.use(protect);
router.post('/', requestWithdrawal);
router.get('/', getWithdrawals);

module.exports = router;
const express = require('express');
const { protect } = require('../middlewares/auth');
const { getProfile, updateProfile, getDashboard, changePassword } = require('../controllers/userController');
const { getAdminWallets, getAdminWalletById } = require('../controllers/adminController')
const router = express.Router();

router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/dashboard', getDashboard);
router.put('/password', changePassword);
router.get('/wallets', getAdminWallets);
router.get('/wallets/:id', getAdminWalletById);

module.exports = router;
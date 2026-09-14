const express = require('express');
const { protect } = require('../middlewares/auth');
const { createDeposit, uploadProof, getDeposits } = require('../controllers/depositController');
const router = express.Router();

router.use(protect);
router.post('/', createDeposit);
router.post('/:depositId/proof', uploadProof);
router.get('/', getDeposits);

module.exports = router;
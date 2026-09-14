const express = require('express');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { uploadProof, getUserProofs, getProofById } = require('../controllers/proofController');
const router = express.Router();

router.use(protect);

// Upload proof for investment/deposit
router.post('/:id/upload', upload.single('proofImage'), uploadProof);

// Get user's proofs
router.get('/my-proofs', getUserProofs);

// Get proof by ID
router.get('/:id', getProofById);

module.exports = router;
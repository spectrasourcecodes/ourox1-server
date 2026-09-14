const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const Proof = require('../models/Proof');
const Investment = require('../models/Investment');
const Deposit = require('../models/Deposit');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { v4: uuidv4 } = require('uuid');

// Configure Cloudinary (should already be configured in upload.js)

// Upload proof with Cloudinary
exports.uploadProof = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, amount, description } = req.body;

  if (!req.file) {
    throw new AppError('Please upload a proof image', 400);
  }

  // Log file info
  console.log('Uploading file:', {
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });

  // Upload to Cloudinary manually using streamifier
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'ark-payment-proofs',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
        transformation: [{ width: 1000, crop: 'limit' }],
        public_id: `proof-${uuidv4()}`,
        timeout: 60000, // 60 seconds timeout
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('Cloudinary upload success:', result.secure_url);
          resolve(result);
        }
      }
    );
    
    // Pipe the file buffer to Cloudinary
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  const imageUrl = uploadResult.secure_url;

  // Check if investment/deposit exists
  let investment = null;
  let deposit = null;

  if (type === 'investment') {
    investment = await Investment.findById(id);
    if (!investment) {
      throw new AppError('Investment not found', 404);
    }
  } else if (type === 'deposit') {
    deposit = await Deposit.findById(id);
    if (!deposit) {
      throw new AppError('Deposit not found', 404);
    }
  }

  // Create proof record
  const proof = await Proof.create({
    user: req.user._id,
    userEmail: req.user.email,
    type: type || 'investment',
    amount: amount || investment?.amount || deposit?.amount || 0,
    currency: req.user.currency || 'USD',
    proofImage: imageUrl,
    reference: `${(type || 'investment').toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`,
    description: description || `${type || 'investment'} payment proof`,
    status: 'pending_verification',
    investmentId: type === 'investment' ? id : null,
    depositId: type === 'deposit' ? id : null,
  });

  // Update investment/deposit with proof reference
  if (type === 'investment') {
    await Investment.findByIdAndUpdate(id, { 
      proofImage: imageUrl,
      status: 'pending_verification',
    });
  } else if (type === 'deposit') {
    await Deposit.findByIdAndUpdate(id, { 
      proofImage: imageUrl,
      status: 'pending_verification',
    });
  }

  res.status(201).json({
    success: true,
    message: 'Proof uploaded successfully',
    data: proof,
  });
});

// Get user's proofs
exports.getUserProofs = asyncHandler(async (req, res) => {
  const proofs = await Proof.find({ user: req.user._id })
    .sort({ createdAt: -1 });
  res.json({ success: true, data: proofs });
});

// Get proof by ID
exports.getProofById = asyncHandler(async (req, res) => {
  const proof = await Proof.findById(req.params.id);
  if (!proof) {
    throw new AppError('Proof not found', 404);
  }
  res.json({ success: true, data: proof });
});
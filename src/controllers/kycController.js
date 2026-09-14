const KYC = require('../models/KYC');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Submit KYC - creates or updates KYC record
 * POST /api/kyc
 */
exports.submitKYC = asyncHandler(async (req, res) => {
  const { personalInfo, governmentId, selfieImage, proofOfAddress } = req.body;

  // Check if KYC already exists
  let kyc = await KYC.findOne({ user: req.user._id });

  if (kyc) {
    // Update existing KYC
    if (personalInfo) {
      kyc.personalInfo = { ...kyc.personalInfo, ...personalInfo };
      kyc.stepsCompleted.personalInfo = true;
    }
    if (governmentId) {
      kyc.governmentId = { ...kyc.governmentId, ...governmentId };
      kyc.stepsCompleted.governmentId = true;
    }
    if (selfieImage) {
      kyc.selfieImage = selfieImage;
      kyc.stepsCompleted.selfie = true;
    }
    if (proofOfAddress) {
      kyc.proofOfAddress = proofOfAddress;
      kyc.stepsCompleted.proofOfAddress = true;
    }

    // Check if all steps are completed
    const allCompleted = Object.values(kyc.stepsCompleted).every(v => v === true);
    if (allCompleted && kyc.status === 'pending') {
      // Keep pending for admin review
      // Or auto-verify if using code verification
    }

    await kyc.save();

    return res.json({
      success: true,
      message: 'KYC updated successfully',
      data: kyc,
    });
  }

  // Create new KYC
  const newKYC = await KYC.create({
    user: req.user._id,
    personalInfo: personalInfo || {},
    governmentId: governmentId || {},
    selfieImage: selfieImage || '',
    proofOfAddress: proofOfAddress || '',
    status: 'pending',
    stepsCompleted: {
      personalInfo: !!personalInfo,
      governmentId: !!governmentId,
      selfie: !!selfieImage,
      proofOfAddress: !!proofOfAddress,
    },
  });

  res.status(201).json({
    success: true,
    message: 'KYC submitted successfully',
    data: newKYC,
  });
});

/**
 * Get user's KYC status
 * GET /api/kyc
 */
exports.getKYC = asyncHandler(async (req, res) => {
  const kyc = await KYC.findOne({ user: req.user._id });
  
  if (!kyc) {
    return res.json({
      success: true,
      data: null,
      status: 'not_submitted',
    });
  }

  res.json({
    success: true,
    data: kyc,
    status: kyc.status,
  });
});

/**
 * Upload KYC document (handles image upload)
 * POST /api/kyc/upload
 */
exports.uploadDocument = asyncHandler(async (req, res) => {
  // In a real scenario, you'd upload to Cloudinary or similar
  // For now, we accept a base64 image or URL
  const { type, image } = req.body;

  if (!type || !image) {
    throw new AppError('Document type and image are required', 400);
  }

  // Find or create KYC record
  let kyc = await KYC.findOne({ user: req.user._id });
  if (!kyc) {
    kyc = new KYC({ user: req.user._id });
  }

  // Update the appropriate field
  const typeMap = {
    governmentIdFront: 'governmentId.frontImage',
    governmentIdBack: 'governmentId.backImage',
    selfie: 'selfieImage',
    proofOfAddress: 'proofOfAddress',
  };

  const field = typeMap[type];
  if (!field) {
    throw new AppError('Invalid document type', 400);
  }

  // For nested fields, use dot notation
  if (field.includes('.')) {
    const [parent, child] = field.split('.');
    kyc[parent][child] = image;
    if (type === 'governmentIdFront' || type === 'governmentIdBack') {
      kyc.stepsCompleted.governmentId = true;
    }
  } else {
    kyc[field] = image;
    if (type === 'selfie') kyc.stepsCompleted.selfie = true;
    if (type === 'proofOfAddress') kyc.stepsCompleted.proofOfAddress = true;
  }

  await kyc.save();

  res.json({
    success: true,
    message: 'Document uploaded successfully',
    data: kyc,
  });
});

/**
 * Verify KYC with code (auto-verification)
 * POST /api/kyc/verify
 */
exports.verifyKYC = asyncHandler(async (req, res) => {
  const { code } = req.body;

  // Get valid code from environment
  const validCode = process.env.KYC_CODE || '768564';

  if (!code || code !== validCode) {
    throw new AppError('Invalid verification code', 400);
  }

  // Update KYC status
  let kyc = await KYC.findOne({ user: req.user._id });
  if (!kyc) {
    // Create KYC record if it doesn't exist
    kyc = new KYC({
      user: req.user._id,
      status: 'verified',
      stepsCompleted: {
        personalInfo: true,
        governmentId: true,
        selfie: true,
        proofOfAddress: true,
      },
      personalInfo: {
        fullName: req.user.fullName || '',
        dateOfBirth: null,
        gender: '',
        nationality: '',
        address: '',
        occupation: '',
      },
      verifiedAt: new Date(),
      verifiedBy: req.user._id,
    });
  } else {
    kyc.status = 'verified';
    kyc.verifiedAt = new Date();
    kyc.verifiedBy = req.user._id;
  }

  await kyc.save();

  // Also update user's isVerified flag
  await User.findByIdAndUpdate(req.user._id, { isVerified: true });

  res.json({
    success: true,
    message: 'KYC verified successfully',
    data: kyc,
  });
});

/**
 * Check if user is KYC verified (for withdrawal page)
 * GET /api/kyc/status
 */
exports.getKYCStatus = asyncHandler(async (req, res) => {
  const kyc = await KYC.findOne({ user: req.user._id });
  
  const isVerified = kyc?.status === 'verified';
  const isPending = kyc?.status === 'pending';
  const isRejected = kyc?.status === 'rejected';

  res.json({
    success: true,
    data: {
      isVerified,
      isPending,
      isRejected,
      status: kyc?.status || 'not_submitted',
      verifiedAt: kyc?.verifiedAt || null,
    },
  });
});

/**
 * Admin: Get all KYC submissions
 * GET /api/admin/kyc
 */
exports.getKYCSubmissions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;

  const kycs = await KYC.find(query)
    .populate('user', 'fullName email phone')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await KYC.countDocuments(query);

  res.json({
    success: true,
    data: kycs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Admin: Verify KYC (admin approval)
 * POST /api/admin/kyc/:id/approve
 */
exports.approveKYC = asyncHandler(async (req, res) => {
  const kyc = await KYC.findById(req.params.id);
  if (!kyc) {
    throw new AppError('KYC record not found', 404);
  }

  if (kyc.status === 'verified') {
    throw new AppError('KYC already verified', 400);
  }

  kyc.status = 'verified';
  kyc.verifiedBy = req.user._id;
  kyc.verifiedAt = new Date();
  await kyc.save();

  // Update user's isVerified flag
  await User.findByIdAndUpdate(kyc.user, { isVerified: true });

  res.json({
    success: true,
    message: 'KYC approved successfully',
    data: kyc,
  });
});

/**
 * Admin: Reject KYC
 * POST /api/admin/kyc/:id/reject
 */
exports.rejectKYC = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const kyc = await KYC.findById(req.params.id);
  if (!kyc) {
    throw new AppError('KYC record not found', 404);
  }

  if (kyc.status === 'verified') {
    throw new AppError('KYC already verified', 400);
  }

  kyc.status = 'rejected';
  kyc.rejectionReason = reason || 'KYC rejected by admin';
  kyc.verifiedBy = req.user._id;
  kyc.verifiedAt = new Date();
  await kyc.save();

  // Update user's isVerified flag
  await User.findByIdAndUpdate(kyc.user, { isVerified: false });

  res.json({
    success: true,
    message: 'KYC rejected',
    data: kyc,
  });
});
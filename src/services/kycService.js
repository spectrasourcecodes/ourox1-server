const KYC = require('../models/KYC');
const User = require('../models/User');
const AppError = require('../utils/appError');

class KYCService {
  // Create or update KYC
  async upsertKYC(userId, data) {
    let kyc = await KYC.findOne({ user: userId });
    if (!kyc) {
      kyc = new KYC({ user: userId });
    }

    // Update fields based on step
    if (data.personalInfo) {
      kyc.personalInfo = { ...kyc.personalInfo, ...data.personalInfo };
      kyc.stepsCompleted.personalInfo = true;
    }
    if (data.governmentId) {
      kyc.governmentId = { ...kyc.governmentId, ...data.governmentId };
      kyc.stepsCompleted.governmentId = true;
    }
    if (data.selfieImage) {
      kyc.selfieImage = data.selfieImage;
      kyc.stepsCompleted.selfie = true;
    }
    if (data.proofOfAddress) {
      kyc.proofOfAddress = data.proofOfAddress;
      kyc.stepsCompleted.proofOfAddress = true;
    }

    // If all steps complete, set status to pending (if not already)
    const allComplete = Object.values(kyc.stepsCompleted).every(v => v === true);
    if (allComplete && kyc.status === 'pending') {
      // already pending
    } else if (allComplete && kyc.status === 'rejected') {
      // reset to pending for re-review
      kyc.status = 'pending';
    } else if (allComplete) {
      kyc.status = 'pending';
    }

    await kyc.save();
    return kyc;
  }

  // Get user KYC
  async getUserKYC(userId) {
    return await KYC.findOne({ user: userId });
  }

  // Admin approve KYC
  async approveKYC(kycId, adminId) {
    const kyc = await KYC.findById(kycId);
    if (!kyc) throw new AppError('KYC not found', 404);
    if (kyc.status === 'verified') throw new AppError('KYC already verified', 400);

    kyc.status = 'verified';
    kyc.verifiedBy = adminId;
    kyc.verifiedAt = new Date();
    await kyc.save();

    // Update user as verified
    await User.findByIdAndUpdate(kyc.user, { isVerified: true });
    return kyc;
  }

  // Admin reject KYC
  async rejectKYC(kycId, adminId, reason) {
    const kyc = await KYC.findById(kycId);
    if (!kyc) throw new AppError('KYC not found', 404);
    if (kyc.status === 'verified') throw new AppError('KYC already verified', 400);

    kyc.status = 'rejected';
    kyc.rejectionReason = reason || 'Not provided';
    kyc.verifiedBy = adminId;
    kyc.verifiedAt = new Date();
    await kyc.save();

    // Optionally set user as not verified
    await User.findByIdAndUpdate(kyc.user, { isVerified: false });
    return kyc;
  }
}

module.exports = new KYCService();
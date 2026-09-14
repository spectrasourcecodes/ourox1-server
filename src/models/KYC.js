const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    personalInfo: {
      fullName: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      gender: { type: String, enum: ['male', 'female', 'other'], required: true },
      nationality: { type: String, required: true },
      address: { type: String, required: true },
      occupation: { type: String, default: '' },
    },
    governmentId: {
      type: { type: String, enum: ['passport', 'driver_license', 'national_id'] },
      frontImage: { type: String, default: '' },
      backImage: { type: String, default: '' },
      idNumber: { type: String, default: '' },
    },
    selfieImage: {
      type: String,
      default: '',
    },
    proofOfAddress: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
    stepsCompleted: {
      personalInfo: { type: Boolean, default: false },
      governmentId: { type: Boolean, default: false },
      selfie: { type: Boolean, default: false },
      proofOfAddress: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KYC', kycSchema);
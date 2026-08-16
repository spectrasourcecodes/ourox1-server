const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    balance: {
      type: Number,
      default: 0,
    },

    profit: {
      type: Number,
      default: 0,
    },

    kyc: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
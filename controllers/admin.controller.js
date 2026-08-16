const Admin = require("../models/admin.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Wallet = require("../models/wallet.model")

const generateToken = (id) => {
  return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(400).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch)
    return res.status(400).json({ message: "Invalid credentials" });

  res.json({
    token: generateToken(admin._id),
  });
};

// get dashboard
const getDashboard = async (req, res) => {
  console.log(req)
  try {
    // Fetch all wallets and populate users
    const wallets = await Wallet.find()
      .populate("user")
      .sort({ createdAt: -1 });

    // Remove wallets without users (safety)
    const validWallets = wallets.filter(w => w.user);

    // Stats
    const totalUsers = validWallets.length;

    const verifiedUsers = validWallets.filter(w => w.user.isVerified).length;
    const unverifiedUsers = totalUsers - verifiedUsers;

    const totalBalance = validWallets.reduce((acc, w) => acc + w.balance, 0);
    const totalProfit = validWallets.reduce((acc, w) => acc + w.profit, 0);

    // Recent users (based on wallet creation or user creation)
    const recentUsers = validWallets.slice(0, 5).map(w => ({
      ...w.user._doc,
      wallet: {
        balance: w.balance,
        profit: w.profit,
        kyc: w.kyc,
      },
    }));

    res.json({
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      totalBalance,
      totalProfit,
      recentUsers,
      wallets: validWallets, // optional full list
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};


const updateWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, profit, kyc } = req.body;

    // 🔍 Find wallet
    const wallet = await Wallet.findById(id);

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found",
      });
    }

    // ✅ Update fields safely
    if (balance !== undefined) wallet.balance = Number(balance);
    if (profit !== undefined) wallet.profit = Number(profit);
    if (kyc !== undefined) wallet.kyc = kyc;

    // 💾 Save changes
    await wallet.save();

    res.json({
      message: "Wallet updated successfully",
      wallet,
    });

  } catch (err) {
    console.error("UPDATE WALLET ERROR:", err);
    res.status(500).json({
      message: "Failed to update wallet",
    });
  }
};

const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  res.json(user);
};

const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
};

const updateUserRole = async (req, res) => {
  const { role } = req.body;
  const user = await User.findById(req.params.id);

  user.role = role;
  await user.save();

  res.json({ message: "Role updated" });
};

module.exports = {
  adminLogin,
  updateWallet,
  getUserById,
  deleteUser,
  updateUserRole,
  getDashboard,
};
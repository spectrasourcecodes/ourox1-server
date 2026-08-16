const User = require("../models/user.model");
const Wallet = require("../models/wallet.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 🔐 Generate Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ✅ REGISTER
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, referralCode } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "All required fields missing" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: "Account already exists" });
    }

    // 🔐 Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Create user
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      referralCode,
    });

    // ✅ Create wallet automatically
    await Wallet.create({
      user: user._id,
    });

    res.status(201).json({
      success: true, 
      message: "Registration successful",
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    res.json({
      success: true, 
      message: "Login successful",
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ GET PROFILE
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};

// Get user profile + wallet
const getUserWithWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Get user (exclude password)
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2️⃣ Get wallet(s) for user
    const wallet = await Wallet.findOne({ user: userId });

    // 3️⃣ Return both in one object
    res.json({ success: true, user, wallet });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ UPDATE PROFILE
const updateUserProfile = async (req, res) => {
  const { fullName, phone, country } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  user.fullName = fullName || user.fullName;
  user.phone = phone || user.phone;
  user.country = country || user.country;

  await user.save();

  res.json({ success: true, message: "Profile updated", user });
};

// ✅ CHANGE PASSWORD
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 🔐 Check current password
    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    // 🔐 Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserWithWallet,
};
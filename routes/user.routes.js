const express = require("express");
const router = express.Router();

// Controllers
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserWithWallet,
} = require("../controllers/user.controller");

// Middlewares
const { protect } = require("../middleware/auth.middleware");

// Public Routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected Routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/change-password", protect, changePassword);
router.get("/dashboard", protect, getUserWithWallet);

module.exports = router;
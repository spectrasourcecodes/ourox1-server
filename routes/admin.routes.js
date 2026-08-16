const express = require("express");
const router = express.Router();

// Controllers
const {
  adminLogin,
  updateWallet,
  getUserById,
  deleteUser,
  updateUserRole,
  getDashboard,
} = require("../controllers/admin.controller");

// Middlewares
const { protect, adminOnly } = require("../middleware/auth.middleware");

// Public Route
router.post("/login", adminLogin);

// Protected Admin Routes
router.get("/users",  getDashboard);
// 🔐 Protected admin route
router.put("/wallets/:id",  updateWallet);
router.get("/users/:id",  getUserById);
router.delete("/users/:id",  deleteUser);
router.put("/users/:id/role",  updateUserRole);

module.exports = router;
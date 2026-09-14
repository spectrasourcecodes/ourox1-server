const AdminWallet = require('../models/AdminWallet');

class AdminWalletService {
  // Get all active wallets
  async getActiveWallets() {
    return await AdminWallet.find({ isActive: true }).sort({ order: 1 });
  }

  // Get wallets by type (crypto, pix, bank)
  async getWalletsByType(type) {
    return await AdminWallet.find({ isActive: true, type });
  }

  // Get a specific wallet by ID
  async getWalletById(id) {
    return await AdminWallet.findById(id);
  }

  // Get default wallet for a currency
  async getDefaultWallet(currency) {
    return await AdminWallet.findOne({ isActive: true, isDefault: true, currency });
  }
}

module.exports = new AdminWalletService();
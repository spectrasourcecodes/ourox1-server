const AdminWallet = require('../models/AdminWallet');
const logger = require('../utils/logger');

const adminWallets = [
  // Cryptocurrencies
  {
    name: 'Bitcoin',
    type: 'crypto',
    currency: 'BTC',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    details: { network: 'Bitcoin' },
    order: 1,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'Ethereum',
    type: 'crypto',
    currency: 'ETH',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    details: { network: 'ERC20' },
    order: 2,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'USDT (ERC20)',
    type: 'crypto',
    currency: 'USDT',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    details: { network: 'ERC20' },
    order: 3,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'BNB (BEP20)',
    type: 'crypto',
    currency: 'BNB',
    address: 'bnb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    details: { network: 'BEP20' },
    order: 4,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'Tron',
    type: 'crypto',
    currency: 'TRX',
    address: 'TQx2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    details: { network: 'TRC20' },
    order: 5,
    isActive: true,
    isDefault: false,
  },
  // PIX
  {
    name: 'PIX (Brazil)',
    type: 'pix',
    currency: 'BRL',
    address: '12345678901234567890',
    details: {
      keyType: 'CPF',
      name: 'Ark Investments',
      bank: 'Banco do Brasil',
    },
    order: 6,
    isActive: true,
    isDefault: false,
  },
  // Bank Transfer
  {
    name: 'Bank Transfer (USD)',
    type: 'bank',
    currency: 'USD',
    address: '1234567890',
    details: {
      bankName: 'Chase Bank',
      accountName: 'Ark Investments LLC',
      accountNumber: '1234567890',
      routingNumber: '021000021',
      swift: 'CHASUS33',
    },
    order: 7,
    isActive: true,
    isDefault: false,
  },
];

const seedAdminWallets = async () => {
  try {
    const count = await AdminWallet.countDocuments();
    if (count > 0) {
      logger.info('ℹ️ Admin wallets already seeded. Skipping...');
      return;
    }
    await AdminWallet.insertMany(adminWallets);
    logger.info(`✅ Seeded ${adminWallets.length} admin wallets (payment methods)`);
  } catch (error) {
    logger.error(`❌ Failed to seed admin wallets: ${error.message}`);
    throw error;
  }
};

module.exports = seedAdminWallets;
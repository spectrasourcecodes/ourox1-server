const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');

// ========== DETERMINE INPUT FILE ==========
let inputFile = process.argv[2];

if (!inputFile) {
  // Default: look in the same directory as this script
  const scriptDir = __dirname;
  const defaultFile = path.join(scriptDir, 'old_db.json');
  if (fs.existsSync(defaultFile)) {
    inputFile = defaultFile;
  } else {
    console.error(`❌ No input file specified and default file not found: ${defaultFile}`);
    console.log(`Usage: node migrate.js [path-to-json-file]`);
    console.log(`Example: node migrate.js ./old_db.json`);
    console.log(`Example: node migrate.js ../exports/database.json`);
    process.exit(1);
  }
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ File not found: ${inputFile}`);
  process.exit(1);
}

console.log(`📂 Reading file: ${inputFile}`);

// ========== READ AND PARSE JSON ==========
const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// ========== EXTRACT TABLES ==========
const tables = {};

rawData.forEach(item => {
  if (item.type === 'table') {
    tables[item.name] = item.data;
  }
});

// ========== ACCESS EACH TABLE ==========
const oldUsers = tables.users || [];
const oldInvestments = tables.investments || [];
const oldWithdrawals = tables.withdrawals || [];
const oldKYC = tables.kycs || [];
const oldNotifications = tables.notifications || [];
const oldTracking = tables.tracking || [];
const oldAdmins = tables.admins || [];

console.log(`📊 Tables found:`);
console.log(`   Users: ${oldUsers.length}`);
console.log(`   Investments: ${oldInvestments.length}`);
console.log(`   Withdrawals: ${oldWithdrawals.length}`);
console.log(`   KYC: ${oldKYC.length}`);
console.log(`   Notifications: ${oldNotifications.length}`);
console.log(`   Tracking: ${oldTracking.length}`);
console.log(`   Admins: ${oldAdmins.length}`);

if (oldUsers.length === 0 && oldAdmins.length === 0) {
  console.error('❌ No user or admin data found. Check your JSON structure.');
  process.exit(1);
}

// ========== CONSTANTS ==========
const COMMON_PASSWORD = '$2b$10$eRxnRfUYCNPb6I6Umu/ZVexvgjWyooq6Qj5O2afSNDoiVm.s4HoKu';

// ========== PLAN MAPPING ==========
const planMap = {
  Starter: { min: 300, max: 1000, dailyROI: 0.5, duration: 30, expectedProfit: 15 },
  Bronze: { min: 500, max: 2500, dailyROI: 0.7, duration: 40, expectedProfit: 28 },
  Silver: { min: 1000, max: 5000, dailyROI: 0.9, duration: 45, expectedProfit: 40.5 },
  Gold: { min: 5030, max: 25000, dailyROI: 1.2, duration: 60, expectedProfit: 72 },
  Diamond: { min: 25000, max: 100000, dailyROI: 1.8, duration: 90, expectedProfit: 162 },
  Platinum: { min: 50000, max: 250000, dailyROI: 2.2, duration: 100, expectedProfit: 220 },
  VIP: { min: 100000, max: 500000, dailyROI: 2.8, duration: 120, expectedProfit: 336 },
};

function determinePlan(amount) {
  if (amount <= 1000) return 'Starter';
  if (amount <= 2500) return 'Bronze';
  if (amount <= 5000) return 'Silver';
  if (amount <= 25000) return 'Gold';
  if (amount <= 100000) return 'Diamond';
  if (amount <= 250000) return 'Platinum';
  return 'VIP';
}

// TODO: Replace these ObjectIds with actual plan _id from your MongoDB
function getPlanObjectId(planName) {
  const map = {
    Starter: '6a5abf45a78b6bcedf3dd480',
    Bronze: '6a5abf45a78b6bcedf3dd481',
    Silver: '6a5abf45a78b6bcedf3dd482',
    Gold: '6a5abf45a78b6bcedf3dd483',
    Diamond: '6a5abf45a78b6bcedf3dd484',
    Platinum: '6a5abf45a78b6bcedf3dd485',
    VIP: '6a5abf45a78b6bcedf3dd486',
  };
  return new ObjectId(map[planName]);
}

// ========== PROCESS ==========
const userIdMap = {};
const newUsers = [];
const newWallets = [];
const newInvestments = [];
const newTransactions = [];
const newWithdrawals = [];
const newKYC = [];
const newNotifications = [];
const newAuditLogs = [];

// 1. Users (including admins)
const allUsers = [...oldUsers, ...oldAdmins.map(admin => ({
  id: admin.id,
  username: admin.username,
  email: admin.email,
  phone_number: admin.phone || '',
  country: 'Unknown',
  amout: '0',
  profit: '0',
  kyc_status: 'verified',
  role: 'admin',
  created_at: admin.created_at,
  updated_at: admin.updated_at,
}))];

allUsers.forEach((user, index) => {
  const newId = new ObjectId();
  const userId = user.id;
  userIdMap[userId] = newId;

  newUsers.push({
    _id: newId,
    fullName: user.username || 'User',
    email: user.email,
    phone: user.phone_number || '',
    country: user.country || 'Unknown',
    currency: 'USD',
    password: COMMON_PASSWORD,
    role: user.role === 'admin' ? 'admin' : 'user',
    isActive: true,
    isVerified: user.kyc_status === 'verified',
    referralCode: `REF${String(index + 1).padStart(3, '0')}`,
    createdAt: new Date(user.created_at || Date.now()),
    updatedAt: new Date(user.updated_at || user.created_at || Date.now()),
    settings: { emailNotifications: true, pushNotifications: true },
    twoFactorEnabled: false,
  });

  newWallets.push({
    user: newId,
    balance: parseFloat(user.amout) || 0,
    profitBalance: parseFloat(user.profit) || 0,
    referralBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    cryptoAddresses: { BTC: '', ETH: '', USDT: '', BNB: '', TRX: '' },
    pendingDepositAmount: 0,
    pendingWithdrawalAmount: 0,
    createdAt: new Date(user.created_at || Date.now()),
    updatedAt: new Date(user.updated_at || user.created_at || Date.now()),
  });
});

// 2. Investments
oldInvestments.forEach((inv) => {
  const userId = userIdMap[inv.user_id];
  if (!userId) return;

  const amount = parseFloat(inv.amount);
  const planName = determinePlan(amount);
  const plan = planMap[planName];

  const startDate = new Date(inv.created_at);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.duration);

  const now = new Date();
  const status = endDate < now ? 'completed' : 'active';

  const newId = new ObjectId();
  const investment = {
    _id: newId,
    user: userId,
    plan: getPlanObjectId(planName),
    amount: amount,
    currency: 'USD',
    startDate: startDate,
    endDate: endDate,
    totalROI: 0,
    status: status,
    planSnapshot: {
      name: planName,
      dailyROI: plan.dailyROI,
      duration: plan.duration,
      expectedProfit: plan.expectedProfit,
    },
    roiCredits: [],
    completedAt: status === 'completed' ? endDate : null,
    reference: `INV-${uuidv4().slice(0, 8).toUpperCase()}`,
    proofImage: '',
    paymentDetails: {},
    paymentConfirmed: status === 'active' || status === 'completed',
    createdAt: startDate,
    updatedAt: new Date(inv.updated_at || inv.created_at),
  };
  newInvestments.push(investment);

  newTransactions.push({
    user: userId,
    type: 'investment',
    amount: amount,
    currency: 'USD',
    status: 'completed',
    reference: investment.reference,
    description: `Investment in ${planName}`,
    investmentId: newId,
    createdAt: startDate,
    updatedAt: new Date(inv.updated_at || inv.created_at),
  });
});

// 3. Withdrawals
oldWithdrawals.forEach((w) => {
  const userId = userIdMap[w.username];
  if (!userId) return;

  const statusMap = {
    pending: 'pending',
    paid: 'completed',
    approved: 'approved',
    rejected: 'rejected',
  };

  const newId = new ObjectId();
  newWithdrawals.push({
    _id: newId,
    user: userId,
    amount: parseFloat(w.amount),
    currency: 'USD',
    cryptoCurrency: w.method ? w.method.toUpperCase() : 'USDT',
    walletAddress: w.wallet_address || '',
    status: statusMap[w.status] || 'pending',
    reference: `WTH-${uuidv4().slice(0, 8).toUpperCase()}`,
    createdAt: new Date(w.created_at),
    updatedAt: new Date(w.updated_at || w.created_at),
  });

  if (w.status === 'paid' || w.status === 'approved') {
    newTransactions.push({
      user: userId,
      type: 'withdrawal',
      amount: parseFloat(w.amount),
      currency: 'USD',
      status: 'completed',
      reference: `WTH-${uuidv4().slice(0, 8).toUpperCase()}`,
      description: `Withdrawal via ${w.method}`,
      withdrawalId: newId,
      createdAt: new Date(w.created_at),
      updatedAt: new Date(w.updated_at || w.created_at),
    });
  }
});

// 4. KYC
oldKYC.forEach((k) => {
  const userId = userIdMap[k.user_id];
  if (!userId) return;

  newKYC.push({
    user: userId,
    personalInfo: { fullName: '', dateOfBirth: null, gender: '', nationality: '', address: '', occupation: '' },
    governmentId: {
      type: k.document_type === 'btc' ? 'passport' : 'driver_license',
      frontImage: '',
      backImage: '',
      idNumber: k.document_number || '',
    },
    selfieImage: '',
    proofOfAddress: '',
    status: k.status === 'verified' ? 'verified' : 'pending',
    stepsCompleted: { personalInfo: true, governmentId: true, selfie: true, proofOfAddress: true },
    createdAt: new Date(k.created_at || Date.now()),
    updatedAt: new Date(k.updated_at || Date.now()),
  });
});

// 5. Notifications
oldNotifications.forEach((n) => {
  const userId = userIdMap[n.user_id];
  if (!userId) return;

  newNotifications.push({
    user: userId,
    title: 'Notification',
    message: n.message || '',
    type: 'info',
    read: false,
    data: {},
    createdAt: new Date(n.created_at),
    updatedAt: new Date(n.updated_at || n.created_at),
  });
});

// 6. Audit Logs (Tracking)
oldTracking.forEach((t) => {
  const userId = userIdMap[t.username];
  if (!userId) return;

  newAuditLogs.push({
    user: userId,
    action: t.activity || 'Action',
    ip: '',
    userAgent: '',
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at || t.created_at),
  });
});

// ========== WRITE OUTPUT ==========
const outputDir = './migration_output';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

fs.writeFileSync(`${outputDir}/users.json`, JSON.stringify(newUsers, null, 2));
fs.writeFileSync(`${outputDir}/wallets.json`, JSON.stringify(newWallets, null, 2));
fs.writeFileSync(`${outputDir}/investments.json`, JSON.stringify(newInvestments, null, 2));
fs.writeFileSync(`${outputDir}/transactions.json`, JSON.stringify(newTransactions, null, 2));
fs.writeFileSync(`${outputDir}/withdrawals.json`, JSON.stringify(newWithdrawals, null, 2));
fs.writeFileSync(`${outputDir}/kyc.json`, JSON.stringify(newKYC, null, 2));
fs.writeFileSync(`${outputDir}/notifications.json`, JSON.stringify(newNotifications, null, 2));
fs.writeFileSync(`${outputDir}/auditlogs.json`, JSON.stringify(newAuditLogs, null, 2));

console.log('✅ Migration complete!');
console.log(`📁 Output files saved in: ${outputDir}/`);
console.log(`Users: ${newUsers.length}, Wallets: ${newWallets.length}, Investments: ${newInvestments.length}, Transactions: ${newTransactions.length}`);
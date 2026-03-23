import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    trim: true,
    lowercase: true
  },
  // Encrypted private key storage
  encryptedPrivateKey: {
    encryptedKey: {
      type: String,
      select: false // Prevent default selection
    },
    algorithm: String,
    keyLength: Number,
    timestamp: Date
  },
  // Trading wallets for copy trading
  tradingWallets: [{
    address: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    label: {
      type: String,
      trim: true,
      default: 'Trading Wallet'
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    minHoldings: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: Date
  }],
  isTrader: {
    type: Boolean,
    default: false
  },
  totalTrades: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalVolume: {
    type: Number,
    default: 0
  },
  avgTradeSize: {
    type: Number,
    default: 0
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  settings: {
    allowCopying: {
      type: Boolean,
      default: true
    },
    minFollowAmount: {
      type: Number,
      default: 1
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Update user stats
userSchema.methods.updateStats = async function(trades) {
  this.totalTrades = trades.length;
  this.totalVolume = trades.reduce((sum, trade) => sum + trade.amount, 0);
  this.avgTradeSize = this.totalTrades > 0 ? this.totalVolume / this.totalTrades : 0;
  
  const winningTrades = trades.filter(t => t.status === 'won').length;
  this.winRate = this.totalTrades > 0 ? (winningTrades / this.totalTrades) * 100 : 0;
  
  this.profitLoss = trades.reduce((sum, trade) => {
    if (trade.status === 'won') return sum + trade.profit;
    if (trade.status === 'lost') return sum - trade.amount;
    return sum;
  }, 0);
  
  this.lastActive = new Date();
  await this.save();
};

// Add trading wallet
userSchema.methods.addTradingWallet = function(address, label, minHoldings = 0) {
  // Check if wallet already exists
  const exists = this.tradingWallets.some(w => w.address.toLowerCase() === address.toLowerCase());
  if (exists) {
    throw new Error('Wallet already exists');
  }

  // If this is the first wallet or marked as default, set it as default
  const isFirst = this.tradingWallets.length === 0;
  
  // Reset all isDefault flags if adding new default
  if (isFirst) {
    this.tradingWallets.forEach(w => w.isDefault = false);
  }

  this.tradingWallets.push({
    address: address.toLowerCase(),
    label: label || `Trading Wallet ${this.tradingWallets.length + 1}`,
    isDefault: isFirst,
    minHoldings: minHoldings || 0
  });

  return this.save();
};

// Remove trading wallet
userSchema.methods.removeTradingWallet = function(address) {
  const wallet = this.tradingWallets.find(w => w.address.toLowerCase() === address.toLowerCase());
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  this.tradingWallets = this.tradingWallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
  
  // If removed wallet was default, set first remaining wallet as default
  if (wallet.isDefault && this.tradingWallets.length > 0) {
    this.tradingWallets[0].isDefault = true;
  }

  return this.save();
};

// Set default trading wallet
userSchema.methods.setDefaultTradingWallet = function(address) {
  const wallet = this.tradingWallets.find(w => w.address.toLowerCase() === address.toLowerCase());
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  // Reset all isDefault flags
  this.tradingWallets.forEach(w => w.isDefault = false);
  wallet.isDefault = true;

  return this.save();
};

// Get default trading wallet
userSchema.methods.getDefaultTradingWallet = function() {
  return this.tradingWallets.find(w => w.isDefault) || this.tradingWallets[0];
};

// Update wallet last used timestamp
userSchema.methods.updateWalletLastUsed = function(address) {
  const wallet = this.tradingWallets.find(w => w.address.toLowerCase() === address.toLowerCase());
  if (wallet) {
    wallet.lastUsed = new Date();
    return this.save();
  }
  return Promise.resolve();
};

export default mongoose.model('User', userSchema);

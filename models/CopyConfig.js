import mongoose from 'mongoose';

const copyConfigSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Trading wallet to use for copy trading
  tradingWalletAddress: {
    type: String,
    trim: true,
    lowercase: true
  },
  copyRatio: {
    type: Number,
    required: true,
    min: 0.01,
    max: 2.0,
    default: 0.5
  },
  minTradeAmount: {
    type: Number,
    default: 1
  },
  maxTradeAmount: {
    type: Number,
    default: 1000
  },
  enabled: {
    type: Boolean,
    default: true
  },
  onlyProfitableMarkets: {
    type: Boolean,
    default: false
  },
  stopLossPercentage: {
    type: Number,
    default: null
  },
  takeProfitPercentage: {
    type: Number,
    default: null
  },
  maxDailyTrades: {
    type: Number,
    default: 10
  },
  maxDailyAmount: {
    type: Number,
    default: 1000
  },
  // Dry run mode - simulate trades without executing them
  dryRun: {
    enabled: {
      type: Boolean,
      default: false
    },
    period: {
      type: Number,
      default: 7 // Simulate past 7 days
    },
    startDate: {
      type: Date,
      default: null // Optional: override start date
    },
    endDate: {
      type: Date,
      default: null // Optional: override end date
    },
    initialBalance: {
      type: Number,
      default: 1000 // Starting balance for simulation
    }
  },
  // Monitoring mode
  monitoringMode: {
    type: String,
    enum: ['polling', 'websocket'],
    default: 'websocket' // 'polling' = scan periodically, 'websocket' = real-time push
  },
  // Category filters
  excludedCategories: [{
    type: String
  }],
  onlyInCategories: [{
    type: String
  }],
  // Price drift filter - max percentage difference between trader's entry price and current market price
  priceDriftFilter: {
    enabled: {
      type: Boolean,
      default: false
    },
    maxDriftPercentage: {
      type: Number,
      default: 5 // 5% max drift
    }
  },
  // Market expiry filter
  marketExpiryFilter: {
    enabled: {
      type: Boolean,
      default: false
    },
    minHoursToExpiry: {
      type: Number,
      default: 1 // Minimum 1 hour until expiry
    },
    maxHoursToExpiry: {
      type: Number,
      default: null // No maximum limit
    }
  },
  // Market price range filter
  marketPriceRangeFilter: {
    enabled: {
      type: Boolean,
      default: false
    },
    minPrice: {
      type: Number,
      default: 0.01 // Minimum 0.01 USDC
    },
    maxPrice: {
      type: Number,
      default: null // No maximum limit
    }
  },
  // Wallet holdings filter
  walletHoldingsFilter: {
    enabled: {
      type: Boolean,
      default: false
    },
    minHoldingsAmount: {
      type: Number,
      default: 10 // Minimum 10 USDC in wallet
    }
  },
  stats: {
    totalCopiedTrades: {
      type: Number,
      default: 0
    },
    totalCopiedAmount: {
      type: Number,
      default: 0
    },
    totalProfit: {
      type: Number,
      default: 0
    },
    totalLoss: {
      type: Number,
      default: 0
    },
    lastCopyTime: {
      type: Date
    },
    dailyTradeCount: {
      type: Number,
      default: 0
    },
    dailyAmount: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    skippedTrades: {
      type: Number,
      default: 0
    },
    skipReasons: [{
      reason: String,
      count: Number,
      lastSkipped: Date
    }],
    // Dry run statistics
    dryRunStats: {
      simulatedTrades: {
        type: Number,
        default: 0
      },
      simulatedAmount: {
        type: Number,
        default: 0
      },
      simulatedProfit: {
        type: Number,
        default: 0
      },
      simulatedLoss: {
        type: Number,
        default: 0
      },
      simulatedWinRate: {
        type: Number,
        default: 0
      },
      simulatedBalance: {
        type: Number,
        default: 0
      },
      roi: {
        type: Number,
        default: 0
      },
      lastSimulationDate: {
        type: Date
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate copy configs
copyConfigSchema.index({ follower: 1, trader: 1 }, { unique: true });

// Pre-save middleware to update timestamps
copyConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if trade passes all filters
copyConfigSchema.methods.passesFilters = async function(trade, market, walletBalance) {
  const skipReasons = [];

  // 1. Check category filters
  if (this.onlyInCategories.length > 0) {
    if (!market.categories || !market.categories.some(cat => this.onlyInCategories.includes(cat))) {
      skipReasons.push('Category not in allowed list');
    }
  }

  if (this.excludedCategories.length > 0) {
    if (market.categories && market.categories.some(cat => this.excludedCategories.includes(cat))) {
      skipReasons.push('Category is excluded');
    }
  }

  // 2. Check price drift filter
  if (this.priceDriftFilter.enabled) {
    const currentPrice = market.currentPrice || market.price;
    const driftPercentage = Math.abs((trade.price - currentPrice) / trade.price) * 100;
    
    if (driftPercentage > this.priceDriftFilter.maxDriftPercentage) {
      skipReasons.push(`Price drift ${driftPercentage.toFixed(2)}% exceeds limit ${this.priceDriftFilter.maxDriftPercentage}%`);
    }
  }

  // 3. Check market expiry filter
  if (this.marketExpiryFilter.enabled) {
    const now = new Date();
    const expiryDate = new Date(market.endDate);
    const hoursToExpiry = (expiryDate - now) / (1000 * 60 * 60);

    if (hoursToExpiry < this.marketExpiryFilter.minHoursToExpiry) {
      skipReasons.push(`Market expires in ${hoursToExpiry.toFixed(1)}h, below minimum ${this.marketExpiryFilter.minHoursToExpiry}h`);
    }

    if (this.marketExpiryFilter.maxHoursToExpiry && hoursToExpiry > this.marketExpiryFilter.maxHoursToExpiry) {
      skipReasons.push(`Market expires in ${hoursToExpiry.toFixed(1)}h, above maximum ${this.marketExpiryFilter.maxHoursToExpiry}h`);
    }
  }

  // 4. Check market price range filter
  if (this.marketPriceRangeFilter.enabled) {
    const marketPrice = market.currentPrice || market.price;

    if (marketPrice < this.marketPriceRangeFilter.minPrice) {
      skipReasons.push(`Market price ${marketPrice} below minimum ${this.marketPriceRangeFilter.minPrice}`);
    }

    if (this.marketPriceRangeFilter.maxPrice && marketPrice > this.marketPriceRangeFilter.maxPrice) {
      skipReasons.push(`Market price ${marketPrice} above maximum ${this.marketPriceRangeFilter.maxPrice}`);
    }
  }

  // 5. Check wallet holdings filter
  if (this.walletHoldingsFilter.enabled) {
    if (walletBalance < this.walletHoldingsFilter.minHoldingsAmount) {
      skipReasons.push(`Wallet balance ${walletBalance} below minimum ${this.walletHoldingsFilter.minHoldingsAmount}`);
    }
  }

  // 6. Check profitable market filter
  if (this.onlyProfitableMarkets) {
    if (!market.isProfitable) {
      skipReasons.push('Market is not profitable');
    }
  }

  return {
    passes: skipReasons.length === 0,
    reasons: skipReasons
  };
};

// Method to record a skipped trade
copyConfigSchema.methods.recordSkippedTrade = function(reason) {
  this.stats.skippedTrades++;
  
  const existingReason = this.stats.skipReasons.find(r => r.reason === reason);
  if (existingReason) {
    existingReason.count++;
    existingReason.lastSkipped = new Date();
  } else {
    this.stats.skipReasons.push({
      reason: reason,
      count: 1,
      lastSkipped: new Date()
    });
  }

  return this.save();
};

// Method to reset daily stats
copyConfigSchema.methods.resetDailyStats = function() {
  this.stats.dailyTradeCount = 0;
  this.stats.dailyAmount = 0;
  this.stats.lastResetDate = new Date();
  return this.save();
};

export default mongoose.model('CopyConfig', copyConfigSchema);

import CopyConfig from '../models/CopyConfig.js';
import Trade from '../models/Trade.js';
import { logger } from '../utils/logger.js';

class RiskControlService {
  // Check if a trade complies with risk limits
  async checkTradeRisk(config, traderTrade) {
    const errors = [];
    const warnings = [];

    // Check if config is enabled
    if (!config.enabled) {
      return { valid: false, error: 'Copy configuration is disabled' };
    }

    // Check daily limits
    const today = new Date().toDateString();
    const lastReset = config.stats.lastResetDate.toDateString();

    if (today !== lastReset) {
      // Reset daily limits
      config.stats.dailyTradeCount = 0;
      config.stats.dailyAmount = 0;
      config.stats.lastResetDate = new Date();
      await config.save();
    }

    if (config.stats.dailyTradeCount >= config.maxDailyTrades) {
      errors.push('Daily trade limit reached');
    }

    const copyAmount = Math.round(traderTrade.amount * config.copyRatio);
    if (config.stats.dailyAmount + copyAmount > config.maxDailyAmount) {
      errors.push('Daily amount limit would be exceeded');
    }

    // Check trade amount limits
    if (copyAmount < config.minTradeAmount) {
      errors.push(`Copy amount ${copyAmount} is below minimum ${config.minTradeAmount}`);
    }

    if (copyAmount > config.maxTradeAmount) {
      errors.push(`Copy amount ${copyAmount} exceeds maximum ${config.maxTradeAmount}`);
    }

    // Check stop loss
    if (config.stopLossPercentage) {
      const totalLoss = await this.calculateTotalLoss(config.follower);
      const stopLossAmount = (config.stats.totalCopiedAmount * config.stopLossPercentage) / 100;

      if (totalLoss > stopLossAmount) {
        errors.push('Stop loss limit reached');
        // Auto-disable the config
        config.enabled = false;
        await config.save();
        logger.info(`Copy config ${config._id} disabled due to stop loss`);
      }
    }

    // Check take profit
    if (config.takeProfitPercentage) {
      const totalProfit = await this.calculateTotalProfit(config.follower);
      const takeProfitAmount = (config.stats.totalCopiedAmount * config.takeProfitPercentage) / 100;

      if (totalProfit >= takeProfitAmount) {
        warnings.push('Take profit target reached');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Calculate total loss for a user
  async calculateTotalLoss(userId) {
    const trades = await Trade.find({
      trader: userId,
      status: 'lost',
    });

    return trades.reduce((sum, trade) => sum + trade.amount, 0);
  }

  // Calculate total profit for a user
  async calculateTotalProfit(userId) {
    const trades = await Trade.find({
      trader: userId,
      status: 'won',
    });

    return trades.reduce((sum, trade) => sum + trade.profit, 0);
  }

  // Check market category filters
  checkCategoryFilter(config, marketCategory) {
    if (config.excludedCategories && config.excludedCategories.includes(marketCategory)) {
      return { valid: false, reason: 'Market category is excluded' };
    }

    if (config.onlyInCategories && config.onlyInCategories.length > 0) {
      if (!config.onlyInCategories.includes(marketCategory)) {
        return { valid: false, reason: 'Market category not in allowed list' };
      }
    }

    return { valid: true };
  }

  // Validate copy ratio
  validateCopyRatio(ratio) {
    if (ratio < 0.01) {
      return { valid: false, error: 'Copy ratio cannot be less than 0.01' };
    }

    if (ratio > 2.0) {
      return { valid: false, error: 'Copy ratio cannot exceed 2.0' };
    }

    return { valid: true };
  }

  // Get risk summary for a copy config
  async getRiskSummary(configId) {
    const config = await CopyConfig.findById(configId);
    if (!config) {
      throw new Error('Copy configuration not found');
    }

    const totalProfit = await this.calculateTotalProfit(config.follower);
    const totalLoss = await this.calculateTotalLoss(config.follower);
    const netResult = totalProfit - totalLoss;
    const roi = config.stats.totalCopiedAmount > 0 
      ? (netResult / config.stats.totalCopiedAmount) * 100 
      : 0;

    return {
      totalCopiedTrades: config.stats.totalCopiedTrades,
      totalCopiedAmount: config.stats.totalCopiedAmount,
      totalProfit,
      totalLoss,
      netResult,
      roi: roi.toFixed(2),
      dailyTradeCount: config.stats.dailyTradeCount,
      dailyAmount: config.stats.dailyAmount,
      dailyLimit: config.maxDailyAmount,
      dailyTradeLimit: config.maxDailyTrades,
      enabled: config.enabled,
    };
  }

  // Check if a trader is safe to follow
  async assessTraderRisk(traderId) {
    const trades = await Trade.find({ trader: traderId });
    
    if (trades.length === 0) {
      return {
        riskLevel: 'unknown',
        message: 'No trading history',
        score: 0,
      };
    }

    const totalTrades = trades.length;
    const wonTrades = trades.filter(t => t.status === 'won').length;
    const winRate = (wonTrades / totalTrades) * 100;
    const avgTradeAmount = trades.reduce((sum, t) => sum + t.amount, 0) / totalTrades;

    // Risk score calculation
    let score = 100;

    // Win rate factor (40% weight)
    score *= (winRate / 100 * 0.4 + 0.6);

    // Trade volume factor (30% weight) - more trades = more reliable
    const volumeScore = Math.min(totalTrades / 100, 1);
    score *= (volumeScore * 0.3 + 0.7);

    // Trade size consistency factor (30% weight)
    const amounts = trades.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b) / amounts.length;
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = 1 - Math.min(stdDev / avgAmount, 1);
    score *= (consistencyScore * 0.3 + 0.7);

    let riskLevel, message;

    if (score >= 80) {
      riskLevel = 'low';
      message = 'Excellent trader with consistent performance';
    } else if (score >= 60) {
      riskLevel = 'medium';
      message = 'Good trader with some variability';
    } else if (score >= 40) {
      riskLevel = 'medium-high';
      message = 'Moderate risk trader';
    } else {
      riskLevel = 'high';
      message = 'High risk trader, use caution';
    }

    return {
      riskLevel,
      message,
      score: score.toFixed(0),
      stats: {
        totalTrades,
        winRate: winRate.toFixed(1),
        avgTradeAmount: avgTradeAmount.toFixed(2),
      },
    };
  }
}

export default new RiskControlService();

import CopyConfig from '../models/CopyConfig.js';
import { logger } from '../utils/logger.js';
import riskControl from './riskControl.js';

class ConfigManager {
  // Create a new copy configuration
  async createConfig(data) {
    try {
      // Validate copy ratio
      const ratioValidation = riskControl.validateCopyRatio(data.copyRatio);
      if (!ratioValidation.valid) {
        throw new Error(ratioValidation.error);
      }

      // Validate amounts
      if (data.minTradeAmount <= 0) {
        throw new Error('Minimum trade amount must be positive');
      }

      if (data.maxTradeAmount < data.minTradeAmount) {
        throw new Error('Maximum trade amount must be greater than minimum');
      }

      // Create config
      const config = new CopyConfig(data);
      await config.save();

      logger.info(`Created copy config: ${config._id}`);
      return config;
    } catch (error) {
      logger.error('Error creating copy config:', error);
      throw error;
    }
  }

  // Update copy configuration
  async updateConfig(configId, updates) {
    try {
      const config = await CopyConfig.findById(configId);
      if (!config) {
        throw new Error('Copy configuration not found');
      }

      // Validate copy ratio if provided
      if (updates.copyRatio !== undefined) {
        const ratioValidation = riskControl.validateCopyRatio(updates.copyRatio);
        if (!ratioValidation.valid) {
          throw new Error(ratioValidation.error);
        }
      }

      // Validate amounts if provided
      const minAmount = updates.minTradeAmount ?? config.minTradeAmount;
      const maxAmount = updates.maxTradeAmount ?? config.maxTradeAmount;

      if (minAmount <= 0) {
        throw new Error('Minimum trade amount must be positive');
      }

      if (maxAmount < minAmount) {
        throw new Error('Maximum trade amount must be greater than minimum');
      }

      // Apply updates
      Object.keys(updates).forEach(key => {
        config[key] = updates[key];
      });

      await config.save();
      logger.info(`Updated copy config: ${configId}`);
      return config;
    } catch (error) {
      logger.error('Error updating copy config:', error);
      throw error;
    }
  }

  // Delete copy configuration
  async deleteConfig(configId) {
    try {
      const config = await CopyConfig.findById(configId);
      if (!config) {
        throw new Error('Copy configuration not found');
      }

      await CopyConfig.findByIdAndDelete(configId);
      logger.info(`Deleted copy config: ${configId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting copy config:', error);
      throw error;
    }
  }

  // Get all active configurations
  async getActiveConfigs() {
    try {
      const configs = await CopyConfig.find({ enabled: true })
        .populate('follower')
        .populate('trader');
      return configs;
    } catch (error) {
      logger.error('Error fetching active configs:', error);
      throw error;
    }
  }

  // Get configuration with risk assessment
  async getConfigWithRisk(configId) {
    try {
      const config = await CopyConfig.findById(configId)
        .populate('follower', 'username walletAddress')
        .populate('trader', 'username totalTrades winRate profitLoss');

      if (!config) {
        throw new Error('Copy configuration not found');
      }

      // Get risk summary
      const riskSummary = await riskControl.getRiskSummary(configId);

      // Assess trader risk
      const traderRisk = await riskControl.assessTraderRisk(config.trader._id);

      return {
        config,
        riskSummary,
        traderRisk,
      };
    } catch (error) {
      logger.error('Error fetching config with risk:', error);
      throw error;
    }
  }

  // Bulk update configurations
  async bulkUpdate(configIds, updates) {
    try {
      const result = await CopyConfig.updateMany(
        { _id: { $in: configIds } },
        { $set: updates }
      );

      logger.info(`Bulk updated ${result.modifiedCount} configurations`);
      return result;
    } catch (error) {
      logger.error('Error in bulk update:', error);
      throw error;
    }
  }

  // Disable configurations that exceed limits
  async autoDisableExceededLimits() {
    try {
      const configs = await CopyConfig.find({ enabled: true });
      let disabledCount = 0;

      for (const config of configs) {
        const riskCheck = await riskControl.checkTradeRisk(config, { amount: 0 });
        if (!riskCheck.valid && riskCheck.errors.length > 0) {
          config.enabled = false;
          await config.save();
          disabledCount++;
          logger.info(`Auto-disabled config ${config._id}: ${riskCheck.errors.join(', ')}`);
        }
      }

      return { disabledCount };
    } catch (error) {
      logger.error('Error auto-disabling configs:', error);
      throw error;
    }
  }

  // Get configuration statistics
  async getConfigStats(userId = null) {
    try {
      const match = userId ? { follower: userId } : {};

      const [total, active, paused] = await Promise.all([
        CopyConfig.countDocuments(match),
        CopyConfig.countDocuments({ ...match, enabled: true }),
        CopyConfig.countDocuments({ ...match, enabled: false }),
      ]);

      const stats = await CopyConfig.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalCopiedTrades: { $sum: '$stats.totalCopiedTrades' },
            totalCopiedAmount: { $sum: '$stats.totalCopiedAmount' },
            totalProfit: { $sum: '$stats.totalProfit' },
            totalLoss: { $sum: '$stats.totalLoss' },
          },
        },
      ]);

      const aggregateStats = stats[0] || {
        totalCopiedTrades: 0,
        totalCopiedAmount: 0,
        totalProfit: 0,
        totalLoss: 0,
      };

      return {
        total,
        active,
        paused,
        ...aggregateStats,
        netResult: aggregateStats.totalProfit - aggregateStats.totalLoss,
      };
    } catch (error) {
      logger.error('Error getting config stats:', error);
      throw error;
    }
  }

  // Validate configuration before creation
  async validateConfig(data) {
    const errors = [];

    if (!data.followerId) errors.push('Follower ID is required');
    if (!data.traderId) errors.push('Trader ID is required');
    if (data.followerId === data.traderId) errors.push('Cannot copy yourself');

    // Check for duplicate
    const existing = await CopyConfig.findOne({
      follower: data.followerId,
      trader: data.traderId,
    });

    if (existing) errors.push('Already following this trader');

    // Validate copy ratio
    if (data.copyRatio) {
      const ratioValidation = riskControl.validateCopyRatio(data.copyRatio);
      if (!ratioValidation.valid) errors.push(ratioValidation.error);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default new ConfigManager();

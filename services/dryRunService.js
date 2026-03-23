import Trade from '../models/Trade.js';
import CopyConfig from '../models/CopyConfig.js';
import { logger } from '../utils/logger.js';

class DryRunService {
  constructor() {
    this.activeSimulations = new Map(); // configId -> simulation data
  }

  /**
   * Run dry run simulation for a copy config
   */
  async runDryRun(configId) {
    try {
      logger.info(`Starting dry run for config: ${configId}`);

      const config = await CopyConfig.findById(configId)
        .populate('follower')
        .populate('trader');

      if (!config) {
        throw new Error('Config not found');
      }

      if (!config.dryRun?.enabled) {
        throw new Error('Dry run is not enabled for this config');
      }

      const { dryRun } = config;
      const period = dryRun.period || 7; // Default 7 days
      const startDate = dryRun.startDate || new Date(Date.now() - period * 24 * 60 * 60 * 1000);
      const endDate = dryRun.endDate || new Date();
      const initialBalance = dryRun.initialBalance || 1000;

      // Get historical trades from trader in the period
      const traderTrades = await Trade.find({
        trader: config.trader._id,
        createdAt: { $gte: startDate, $lte: endDate }
      })
        .sort({ createdAt: 1 })
        .populate('market');

      logger.info(`Found ${traderTrades.length} trades to simulate`);

      let simulatedBalance = initialBalance;
      let simulatedTrades = 0;
      let simulatedAmount = 0;
      let simulatedProfit = 0;
      let simulatedLoss = 0;
      let winningTrades = 0;
      const tradeDetails = [];

      for (const traderTrade of traderTrades) {
        const copyAmount = Math.round(traderTrade.amount * config.copyRatio);

        // Check amount limits
        if (copyAmount < config.minTradeAmount || copyAmount > config.maxTradeAmount) {
          tradeDetails.push({
            tradeId: traderTrade._id,
            timestamp: traderTrade.createdAt,
            reason: 'Amount outside allowed range',
            skipped: true
          });
          continue;
        }

        // Apply filters
        const market = traderTrade.market;
        const filterResult = await config.passesFilters(traderTrade, market, simulatedBalance);

        if (!filterResult.passes) {
          tradeDetails.push({
            tradeId: traderTrade._id,
            timestamp: traderTrade.createdAt,
            reason: filterResult.reasons.join(', '),
            skipped: true
          });
          continue;
        }

        // Simulate trade
        simulatedBalance -= copyAmount;
        simulatedTrades++;
        simulatedAmount += copyAmount;

        // Simulate outcome based on historical results
        if (traderTrade.status === 'won') {
          const profit = traderTrade.profit || (traderTrade.amount * (1 / traderTrade.price - 1));
          simulatedProfit += profit;
          simulatedBalance += (copyAmount + profit);
          winningTrades++;
        } else if (traderTrade.status === 'lost') {
          simulatedLoss += copyAmount;
        }

        tradeDetails.push({
          tradeId: traderTrade._id,
          timestamp: traderTrade.createdAt,
          marketTitle: market.title,
          outcomeName: traderTrade.outcomeName,
          amount: copyAmount,
          price: traderTrade.price,
          direction: traderTrade.direction,
          outcome: traderTrade.status,
          profit: traderTrade.status === 'won' ? 
            (traderTrade.profit || (traderTrade.amount * (1 / traderTrade.price - 1))) * (copyAmount / traderTrade.amount) : 
            null,
          loss: traderTrade.status === 'lost' ? copyAmount : null,
          balance: simulatedBalance,
          skipped: false
        });

        logger.debug(`Simulated trade: ${copyAmount}, Balance: ${simulatedBalance.toFixed(2)}`);
      }

      // Calculate statistics
      const totalProfitLoss = simulatedProfit - simulatedLoss;
      const roi = ((simulatedBalance - initialBalance) / initialBalance) * 100;
      const winRate = simulatedTrades > 0 ? (winningTrades / simulatedTrades) * 100 : 0;
      const avgTradeSize = simulatedTrades > 0 ? simulatedAmount / simulatedTrades : 0;
      const profitFactor = simulatedLoss > 0 ? simulatedProfit / simulatedLoss : 0;

      // Update dry run stats
      config.stats.dryRunStats = {
        simulatedTrades,
        simulatedAmount,
        simulatedProfit,
        simulatedLoss,
        simulatedWinRate: winRate,
        simulatedBalance,
        roi,
        avgTradeSize,
        profitFactor,
        lastSimulationDate: new Date()
      };

      await config.save();

      const result = {
        configId: config._id,
        trader: config.trader.username,
        follower: config.follower.username,
        period: `${period} days`,
        startDate,
        endDate,
        initialBalance,
        finalBalance: simulatedBalance,
        totalProfitLoss,
        roi,
        simulatedTrades,
        simulatedAmount,
        simulatedProfit,
        simulatedLoss,
        winRate,
        avgTradeSize,
        profitFactor,
        tradeDetails
      };

      logger.info(`Dry run completed for ${config.follower.username}:`);
      logger.info(`  - Simulated Trades: ${simulatedTrades}`);
      logger.info(`  - Simulated Amount: ${simulatedAmount.toFixed(2)} USDC`);
      logger.info(`  - Profit: ${simulatedProfit.toFixed(2)} USDC`);
      logger.info(`  - Loss: ${simulatedLoss.toFixed(2)} USDC`);
      logger.info(`  - Win Rate: ${winRate.toFixed(2)}%`);
      logger.info(`  - Final Balance: ${simulatedBalance.toFixed(2)} USDC`);
      logger.info(`  - ROI: ${roi.toFixed(2)}%`);

      return result;
    } catch (error) {
      logger.error('Error running dry run:', error);
      throw error;
    }
  }

  /**
   * Simulate a single trade (for real-time dry run)
   */
  async simulateTrade(configId, tradeData) {
    try {
      const config = await CopyConfig.findById(configId)
        .populate('follower')
        .populate('trader');

      if (!config || !config.dryRun?.enabled) {
        return null;
      }

      const copyAmount = Math.round(tradeData.amount * config.copyRatio);

      logger.info(`Simulating trade for ${config.follower.username}: ${copyAmount} USDC`);

      // Update dry run stats
      if (!config.stats.dryRunStats) {
        config.stats.dryRunStats = {
          simulatedTrades: 0,
          simulatedAmount: 0,
          simulatedProfit: 0,
          simulatedLoss: 0,
          simulatedWinRate: 0,
          simulatedBalance: config.dryRun.initialBalance || 1000,
          roi: 0
        };
      }

      const stats = config.stats.dryRunStats;
      stats.simulatedTrades++;
      stats.simulatedAmount += copyAmount;

      // Simulate outcome (based on historical win rate)
      const traderStats = await this.getTraderHistoricalStats(config.trader._id);
      const winProbability = traderStats.winRate / 100;
      const won = Math.random() < winProbability;

      if (won) {
        const profit = copyAmount * (1 / tradeData.price - 1);
        stats.simulatedProfit += profit;
        stats.simulatedBalance += (copyAmount + profit);
      } else {
        stats.simulatedLoss += copyAmount;
        stats.simulatedBalance -= copyAmount;
      }

      // Update win rate and ROI
      const winningTrades = stats.simulatedTrades > 0 ?
        (stats.simulatedProfit / (stats.simulatedAmount * (1 / (winProbability || 0.5)))) * stats.simulatedTrades :
        (stats.simulatedTrades * winProbability);

      stats.simulatedWinRate = (winningTrades / stats.simulatedTrades) * 100;
      stats.roi = ((stats.simulatedBalance - (config.dryRun.initialBalance || 1000)) / (config.dryRun.initialBalance || 1000)) * 100;
      stats.lastSimulationDate = new Date();

      await config.save();

      const result = {
        configId: config._id,
        tradeId: tradeData.transactionHash || tradeData.id,
        amount: copyAmount,
        outcome: won ? 'won' : 'lost',
        profit: won ? (copyAmount * (1 / tradeData.price - 1)) : null,
        loss: won ? null : copyAmount,
        balance: stats.simulatedBalance,
        timestamp: new Date()
      };

      logger.info(`Trade simulation completed: ${won ? 'WON' : 'LOST'}, Balance: ${stats.simulatedBalance.toFixed(2)}`);

      return result;
    } catch (error) {
      logger.error('Error simulating trade:', error);
      throw error;
    }
  }

  /**
   * Get trader's historical statistics
   */
  async getTraderHistoricalStats(traderId) {
    try {
      const trades = await Trade.find({ trader: traderId });
      
      const totalTrades = trades.length;
      const winningTrades = trades.filter(t => t.status === 'won').length;
      const totalVolume = trades.reduce((sum, t) => sum + t.amount, 0);
      const totalProfit = trades.reduce((sum, t) => {
        if (t.status === 'won') return sum + (t.profit || 0);
        if (t.status === 'lost') return sum - t.amount;
        return sum;
      }, 0);

      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

      return {
        totalTrades,
        winningTrades,
        winRate,
        totalVolume,
        totalProfit,
        avgTradeSize
      };
    } catch (error) {
      logger.error('Error getting trader historical stats:', error);
      return {
        totalTrades: 0,
        winningTrades: 0,
        winRate: 50,
        totalVolume: 0,
        totalProfit: 0,
        avgTradeSize: 0
      };
    }
  }

  /**
   * Get dry run results for a config
   */
  async getDryRunResults(configId) {
    try {
      const config = await CopyConfig.findById(configId);

      if (!config) {
        throw new Error('Config not found');
      }

      return config.stats.dryRunStats || null;
    } catch (error) {
      logger.error('Error getting dry run results:', error);
      throw error;
    }
  }

  /**
   * Reset dry run statistics for a config
   */
  async resetDryRunStats(configId) {
    try {
      const config = await CopyConfig.findById(configId);

      if (!config) {
        throw new Error('Config not found');
      }

      config.stats.dryRunStats = {
        simulatedTrades: 0,
        simulatedAmount: 0,
        simulatedProfit: 0,
        simulatedLoss: 0,
        simulatedWinRate: 0,
        simulatedBalance: config.dryRun.initialBalance || 1000,
        roi: 0
      };

      await config.save();

      logger.info(`Dry run stats reset for config: ${configId}`);
      return true;
    } catch (error) {
      logger.error('Error resetting dry run stats:', error);
      throw error;
    }
  }

  /**
   * Compare multiple dry run results
   */
  async compareDryRuns(configIds) {
    try {
      const results = [];

      for (const configId of configIds) {
        const stats = await this.getDryRunResults(configId);
        const config = await CopyConfig.findById(configId).populate('trader');
        
        if (stats) {
          results.push({
            configId,
            trader: config.trader.username,
            copyRatio: config.copyRatio,
            ...stats
          });
        }
      }

      // Sort by ROI
      results.sort((a, b) => b.roi - a.roi);

      return results;
    } catch (error) {
      logger.error('Error comparing dry runs:', error);
      throw error;
    }
  }
}

export default new DryRunService();

import cron from 'node-cron';
import Trade from '../models/Trade.js';
import CopyConfig from '../models/CopyConfig.js';
import User from '../models/User.js';
import Market from '../models/Market.js';
import { logger } from '../utils/logger.js';
import polymarketApi from './polymarketApi.js';
import web3Service from './web3Service.js';
import websocketListener from './websocketListener.js';

let io = null;
let monitoringInterval = null;
let walletMonitors = new Map(); // walletAddress -> configIds

export async function startMonitoring(socketIO) {
  if (io === null) {
    io = socketIO;
    logger.info('Socket.io instance set for copy monitoring');
  }

  if (monitoringInterval) {
    logger.info('Monitoring already running');
    return;
  }

  logger.info('Starting copy trading monitoring...');

  // Connect to WebSocket for real-time monitoring
  await websocketListener.connect();
  
  // Setup polling for configs that use polling mode
  monitoringInterval = setInterval(async () => {
    await processCopyTrades();
  }, 30000); // Check every 30 seconds for polling configs

  // Subscribe to trader wallets for WebSocket configs
  await subscribeToTraderWallets();

  logger.info('Copy trading monitoring started');
}

export async function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('Copy trading monitoring stopped');
  }
  
  // Unsubscribe from all wallets
  await unsubscribeFromAllWallets();
  
  // Disconnect WebSocket
  await websocketListener.disconnect();
}

/**
 * Subscribe to trader wallets for real-time monitoring
 */
async function subscribeToTraderWallets() {
  try {
    const enabledConfigs = await CopyConfig.find({ 
      enabled: true,
      monitoringMode: 'websocket'
    }).populate('trader');

    const walletSubscriptions = new Map();

    for (const config of enabledConfigs) {
      const traderAddress = config.trader.walletAddress;
      
      if (!walletSubscriptions.has(traderAddress)) {
        walletSubscriptions.set(traderAddress, []);
      }
      
      walletSubscriptions.get(traderAddress).push(config._id);
    }

    // Subscribe to each unique wallet
    for (const [walletAddress, configIds] of walletSubscriptions) {
      try {
        await websocketListener.subscribeToWallet(walletAddress, async (event) => {
          if (event.type === 'trade') {
            logger.info(`Real-time trade detected from ${walletAddress}`);
            await handleRealTimeTrade(event, configIds);
          }
        });
        
        walletMonitors.set(walletAddress, configIds);
        logger.info(`Subscribed to trader wallet: ${walletAddress}`);
      } catch (error) {
        logger.error(`Failed to subscribe to wallet ${walletAddress}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error subscribing to trader wallets:', error);
  }
}

/**
 * Unsubscribe from all wallet subscriptions
 */
async function unsubscribeFromAllWallets() {
  try {
    for (const walletAddress of walletMonitors.keys()) {
      await websocketListener.unsubscribeFromWallet(walletAddress);
    }
    walletMonitors.clear();
    logger.info('Unsubscribed from all wallets');
  } catch (error) {
    logger.error('Error unsubscribing from wallets:', error);
  }
}

/**
 * Handle real-time trade from WebSocket
 */
async function handleRealTimeTrade(event, configIds) {
  try {
    const { trade, walletAddress } = event;
    
    logger.info(`Processing real-time trade from ${walletAddress}`);

    // Find trader by wallet address
    const trader = await User.findOne({ walletAddress });
    if (!trader) {
      logger.warn(`Trader not found for wallet: ${walletAddress}`);
      return;
    }

    // Process each config that follows this trader
    for (const configId of configIds) {
      const config = await CopyConfig.findById(configId)
        .populate('follower')
        .populate('trader');
      
      if (!config || !config.enabled) {
        continue;
      }

      // Process the trade
      await processTraderTrade(config, trade);
    }
  } catch (error) {
    logger.error('Error handling real-time trade:', error);
  }
}

async function processCopyTrades() {
  try {
    logger.debug('Processing copy trades...');

    const enabledConfigs = await CopyConfig.find({ enabled: true })
      .populate('follower')
      .populate('trader');

    for (const config of enabledConfigs) {
      // Check monitoring mode
      if (config.monitoringMode === 'polling' || config.dryRun?.enabled) {
        await processFollower(config);
      }
      // WebSocket mode is handled by real-time callbacks
    }

    logger.debug(`Processed ${enabledConfigs.length} copy configurations`);
  } catch (error) {
    logger.error('Error processing copy trades:', error);
  }
}

/**
 * Process a trade from trader (for real-time WebSocket events)
 */
async function processTraderTrade(config, tradeData) {
  try {
    const { follower, trader, copyRatio } = config;

    // Check if this is dry run mode
    if (config.dryRun?.enabled) {
      await simulateTrade(config, tradeData);
      return;
    }

    // Real execution mode
    // TODO: Parse tradeData and execute real trade
    logger.info(`Would execute real trade for ${follower.username} following ${trader.username}`);
  } catch (error) {
    logger.error('Error processing trader trade:', error);
  }
}

async function processFollower(config) {
  try {
    const { follower, trader, copyRatio, minTradeAmount, maxTradeAmount, stats } = config;

    // Check daily limits
    await resetDailyLimitsIfNeeded(config);

    if (stats.dailyTradeCount >= config.maxDailyTrades) {
      logger.debug(`Daily trade limit reached for ${follower.username}`);
      return; // Daily trade limit reached
    }

    if (stats.dailyAmount >= config.maxDailyAmount) {
      logger.debug(`Daily amount limit reached for ${follower.username}`);
      return; // Daily amount limit reached
    }

    // Get trading wallet address
    const tradingWalletAddress = config.tradingWalletAddress || follower.getDefaultTradingWallet()?.address;
    if (!tradingWalletAddress) {
      logger.warn(`No trading wallet configured for ${follower.username}`);
      return;
    }

    // Get wallet balance
    const walletBalance = parseFloat(await web3Service.getBalance(tradingWalletAddress));

    // Get recent trades from trader
    const recentTraderTrades = await Trade.find({
      trader: trader._id,
      status: 'open',
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
    })
      .sort({ createdAt: -1 })
      .populate('market');

    for (const traderTrade of recentTraderTrades) {
      // Check if already copied
      const alreadyCopied = await Trade.findOne({
        trader: follower._id,
        market: traderTrade.market._id,
        outcomeId: traderTrade.outcomeId,
        copiedFrom: traderTrade._id,
      });

      if (alreadyCopied) {
        continue;
      }

      // Get market data
      const market = await Market.findById(traderTrade.market._id);
      
      // Apply all filters
      const filterResult = await config.passesFilters(traderTrade, market, walletBalance);
      
      if (!filterResult.passes) {
        // Record why the trade was skipped
        for (const reason of filterResult.reasons) {
          await config.recordSkippedTrade(reason);
        }
        
        logger.debug(`Trade skipped for ${follower.username}: ${filterResult.reasons.join(', ')}`);
        continue;
      }

      // Check amount limits
      const copyAmount = Math.round(traderTrade.amount * copyRatio);
      if (copyAmount < minTradeAmount || copyAmount > maxTradeAmount) {
        await config.recordSkippedTrade(`Amount ${copyAmount} outside allowed range`);
        continue;
      }

      // Check daily limits
      if (stats.dailyTradeCount >= config.maxDailyTrades || 
          stats.dailyAmount + copyAmount > config.maxDailyAmount) {
        logger.debug(`Daily limit reached for ${follower.username}`);
        break;
      }

      // Execute copy trade
      await executeCopyTrade(follower, trader, traderTrade, copyAmount, config, tradingWalletAddress);
    }
  } catch (error) {
    logger.error('Error processing follower:', error);
  }
}

async function executeCopyTrade(follower, trader, traderTrade, copyAmount, config, tradingWalletAddress) {
  try {
    logger.info(`Executing copy trade for ${follower.username} following ${trader.username}`);

    const copyTrade = new Trade({
      polymarketId: traderTrade.polymarketId,
      trader: follower._id,
      market: traderTrade.market,
      outcomeId: traderTrade.outcomeId,
      outcomeName: traderTrade.outcomeName,
      amount: copyAmount,
      price: traderTrade.price,
      shares: copyAmount / traderTrade.price,
      direction: traderTrade.direction,
      status: 'open',
      copiedFrom: traderTrade._id,
      tradingWalletAddress: tradingWalletAddress,
    });

    await copyTrade.save();

    // Update trader trade to reflect it was copied
    traderTrade.copiedTradesCount += 1;
    await traderTrade.save();

    // Update config stats
    config.stats.totalCopiedTrades += 1;
    config.stats.totalCopiedAmount += copyAmount;
    config.stats.dailyTradeCount += 1;
    config.stats.dailyAmount += copyAmount;
    config.stats.lastCopyTime = new Date();
    await config.save();

    // Update wallet last used
    await follower.updateWalletLastUsed(tradingWalletAddress);

    // Notify follower via WebSocket
    if (io) {
      io.to(`user-${follower._id}`).emit('trade-copied', {
        tradeId: copyTrade._id,
        originalTradeId: traderTrade._id,
        marketTitle: traderTrade.market.title,
        amount: copyAmount,
        walletAddress: tradingWalletAddress,
        timestamp: new Date(),
      });
    }

    logger.info(`Copy trade executed successfully: ${copyTrade._id}`);
  } catch (error) {
    logger.error('Error executing copy trade:', error);
  }
}

async function resetDailyLimitsIfNeeded(config) {
  const today = new Date().toDateString();
  const lastReset = config.stats.lastResetDate.toDateString();

  if (today !== lastReset) {
    config.stats.dailyTradeCount = 0;
    config.stats.dailyAmount = 0;
    config.stats.lastResetDate = new Date();
    await config.save();
  }
}

export async function processTraderTrades(traderAddress) {
  try {
    const trader = await User.findOne({ walletAddress: traderAddress });
    if (!trader) {
      throw new Error('Trader not found');
    }

    // Here you would integrate with Polymarket to fetch real trades
    // This is a placeholder implementation
    logger.info(`Processing trades for trader ${trader.username}`);
    
    // Update trader stats
    const trades = await Trade.find({ trader: trader._id });
    await trader.updateStats(trades);
    
    return trades;
  } catch (error) {
    logger.error('Error processing trader trades:', error);
    throw error;
  }
}

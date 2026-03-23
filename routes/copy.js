import express from 'express';
import User from '../models/User.js';
import CopyConfig from '../models/CopyConfig.js';
import Trade from '../models/Trade.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Create copy configuration
router.post('/', async (req, res) => {
  try {
    const { followerId, traderId, copyRatio, minTradeAmount, maxTradeAmount, 
            stopLossPercentage, takeProfitPercentage, maxDailyTrades, 
            maxDailyAmount, excludedCategories, onlyInCategories } = req.body;

    if (!followerId || !traderId) {
      return res.status(400).json({ error: 'Follower and trader IDs are required' });
    }

    if (followerId === traderId) {
      return res.status(400).json({ error: 'Cannot copy yourself' });
    }

    const follower = await User.findById(followerId);
    const trader = await User.findById(traderId);

    if (!follower || !trader) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!trader.settings.allowCopying) {
      return res.status(400).json({ error: 'Trader does not allow copying' });
    }

    // Check if copy config already exists
    const existingConfig = await CopyConfig.findOne({ follower: followerId, trader: traderId });
    if (existingConfig) {
      return res.status(400).json({ error: 'Already copying this trader' });
    }

    const copyConfig = new CopyConfig({
      follower: followerId,
      trader: traderId,
      copyRatio: copyRatio || 0.5,
      minTradeAmount: minTradeAmount || 1,
      maxTradeAmount: maxTradeAmount || 1000,
      stopLossPercentage,
      takeProfitPercentage,
      maxDailyTrades: maxDailyTrades || 10,
      maxDailyAmount: maxDailyAmount || 1000,
      excludedCategories: excludedCategories || [],
      onlyInCategories: onlyInCategories || [],
    });

    await copyConfig.save();

    // Update user relationships
    follower.following.push(traderId);
    trader.followers.push(followerId);
    await Promise.all([follower.save(), trader.save()]);

    res.status(201).json({
      message: 'Copy configuration created successfully',
      config: {
        id: copyConfig._id,
        trader: {
          id: trader._id,
          username: trader.username,
          totalTrades: trader.totalTrades,
          winRate: trader.winRate,
          profitLoss: trader.profitLoss,
        },
        copyRatio: copyConfig.copyRatio,
        minTradeAmount: copyConfig.minTradeAmount,
        maxTradeAmount: copyConfig.maxTradeAmount,
        enabled: copyConfig.enabled,
        stats: copyConfig.stats,
      },
    });
  } catch (error) {
    logger.error('Error creating copy config:', error);
    res.status(500).json({ error: 'Failed to create copy configuration' });
  }
});

// Get user's copy configurations
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const configs = await CopyConfig.find({ follower: userId })
      .populate('trader', 'username walletAddress totalTrades winRate profitLoss')
      .sort({ createdAt: -1 });

    res.json({ configs });
  } catch (error) {
    logger.error('Error fetching copy configs:', error);
    res.status(500).json({ error: 'Failed to fetch copy configurations' });
  }
});

// Get copy configuration by ID
router.get('/:id', async (req, res) => {
  try {
    const config = await CopyConfig.findById(req.params.id)
      .populate('follower', 'username walletAddress')
      .populate('trader', 'username walletAddress totalTrades winRate profitLoss');

    if (!config) {
      return res.status(404).json({ error: 'Copy configuration not found' });
    }

    res.json({ config });
  } catch (error) {
    logger.error('Error fetching copy config:', error);
    res.status(500).json({ error: 'Failed to fetch copy configuration' });
  }
});

// Update copy configuration
router.put('/:id', async (req, res) => {
  try {
    const config = await CopyConfig.findById(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Copy configuration not found' });
    }

    const updates = [
      'copyRatio', 'minTradeAmount', 'maxTradeAmount', 'enabled',
      'stopLossPercentage', 'takeProfitPercentage', 'maxDailyTrades',
      'maxDailyAmount', 'excludedCategories', 'onlyInCategories'
    ];

    updates.forEach(field => {
      if (req.body[field] !== undefined) {
        config[field] = req.body[field];
      }
    });

    await config.save();

    res.json({
      message: 'Copy configuration updated successfully',
      config,
    });
  } catch (error) {
    logger.error('Error updating copy config:', error);
    res.status(500).json({ error: 'Failed to update copy configuration' });
  }
});

// Delete copy configuration
router.delete('/:id', async (req, res) => {
  try {
    const config = await CopyConfig.findById(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Copy configuration not found' });
    }

    const { follower, trader } = config;

    // Update user relationships
    await User.findByIdAndUpdate(follower, { $pull: { following: trader } });
    await User.findByIdAndUpdate(trader, { $pull: { followers: follower } });

    await CopyConfig.findByIdAndDelete(req.params.id);

    res.json({ message: 'Copy configuration deleted successfully' });
  } catch (error) {
    logger.error('Error deleting copy config:', error);
    res.status(500).json({ error: 'Failed to delete copy configuration' });
  }
});

// Get copy statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const config = await CopyConfig.findById(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Copy configuration not found' });
    }

    const copiedTrades = await Trade.find({
      trader: config.follower,
      copiedFrom: { $exists: true },
    });

    const totalCopied = copiedTrades.length;
    const totalAmount = copiedTrades.reduce((sum, trade) => sum + trade.amount, 0);
    const wonTrades = copiedTrades.filter(t => t.status === 'won');
    const lostTrades = copiedTrades.filter(t => t.status === 'lost');

    res.json({
      stats: {
        totalCopied,
        totalAmount,
        winRate: totalCopied > 0 ? (wonTrades.length / totalCopied) * 100 : 0,
        totalProfit: wonTrades.reduce((sum, t) => sum + t.profit, 0),
        totalLoss: lostTrades.reduce((sum, t) => sum + t.amount, 0),
        netProfit: wonTrades.reduce((sum, t) => sum + t.profit, 0) - 
                  lostTrades.reduce((sum, t) => sum + t.amount, 0),
      },
    });
  } catch (error) {
    logger.error('Error fetching copy stats:', error);
    res.status(500).json({ error: 'Failed to fetch copy statistics' });
  }
});

export default router;

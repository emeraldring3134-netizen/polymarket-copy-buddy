import express from 'express';
import User from '../models/User.js';
import Trade from '../models/Trade.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get top traders
router.get('/top', async (req, res) => {
  try {
    const { limit = 20, sortBy = 'profitLoss' } = req.query;

    const sortOptions = {};
    sortOptions[sortBy] = -1;

    const traders = await User.find({ isTrader: true })
      .sort(sortOptions)
      .limit(parseInt(limit))
      .select('username walletAddress totalTrades winRate profitLoss totalVolume avgTradeSize followers createdAt');

    res.json({ traders });
  } catch (error) {
    logger.error('Error fetching top traders:', error);
    res.status(500).json({ error: 'Failed to fetch top traders' });
  }
});

// Get trader by ID
router.get('/:id', async (req, res) => {
  try {
    const trader = await User.findById(req.params.id)
      .populate('followers', 'username totalTrades winRate')
      .populate('following', 'username totalTrades winRate');

    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    // Get trader's recent trades
    const recentTrades = await Trade.find({ trader: trader._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('market', 'title polymarketId');

    res.json({
      trader: {
        id: trader._id,
        username: trader.username,
        walletAddress: trader.walletAddress,
        totalTrades: trader.totalTrades,
        winRate: trader.winRate,
        profitLoss: trader.profitLoss,
        totalVolume: trader.totalVolume,
        avgTradeSize: trader.avgTradeSize,
        followersCount: trader.followers.length,
        followingCount: trader.following.length,
        settings: trader.settings,
        createdAt: trader.createdAt,
      },
      recentTrades,
    });
  } catch (error) {
    logger.error('Error fetching trader:', error);
    res.status(500).json({ error: 'Failed to fetch trader' });
  }
});

// Search traders
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;

    const traders = await User.find({
      isTrader: true,
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { walletAddress: { $regex: query, $options: 'i' } },
      ],
    })
      .limit(parseInt(limit))
      .select('username walletAddress totalTrades winRate profitLoss');

    res.json({ traders });
  } catch (error) {
    logger.error('Error searching traders:', error);
    res.status(500).json({ error: 'Failed to search traders' });
  }
});

// Update trader settings
router.put('/:id/settings', async (req, res) => {
  try {
    const trader = await User.findById(req.params.id);

    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    const { allowCopying, minFollowAmount } = req.body;

    if (allowCopying !== undefined) trader.settings.allowCopying = allowCopying;
    if (minFollowAmount !== undefined) trader.settings.minFollowAmount = minFollowAmount;

    await trader.save();

    res.json({
      message: 'Settings updated successfully',
      settings: trader.settings,
    });
  } catch (error) {
    logger.error('Error updating trader settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;

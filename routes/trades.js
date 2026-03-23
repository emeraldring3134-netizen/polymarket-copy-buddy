import express from 'express';
import Trade from '../models/Trade.js';
import User from '../models/User.js';
import Market from '../models/Market.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Create trade
router.post('/', async (req, res) => {
  try {
    const { 
      traderId, 
      marketId, 
      outcomeId, 
      outcomeName, 
      amount, 
      price, 
      direction, 
      polymarketId 
    } = req.body;

    if (!traderId || !marketId || !outcomeId || !amount || !price || !direction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const trader = await User.findById(traderId);
    const market = await Market.findById(marketId);

    if (!trader || !market) {
      return res.status(404).json({ error: 'Trader or market not found' });
    }

    const trade = new Trade({
      polymarketId: polymarketId || market.polymarketId,
      trader: traderId,
      market: marketId,
      outcomeId,
      outcomeName,
      amount,
      price,
      shares: amount / price,
      direction,
      status: 'open',
    });

    await trade.save();

    // Update trader stats
    const allTrades = await Trade.find({ trader: traderId });
    await trader.updateStats(allTrades);

    res.status(201).json({
      message: 'Trade created successfully',
      trade,
    });
  } catch (error) {
    logger.error('Error creating trade:', error);
    res.status(500).json({ error: 'Failed to create trade' });
  }
});

// Get trades
router.get('/', async (req, res) => {
  try {
    const { traderId, marketId, status, limit = 50, page = 1 } = req.query;

    const query = {};
    if (traderId) query.trader = traderId;
    if (marketId) query.market = marketId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const trades = await Trade.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('trader', 'username walletAddress')
      .populate('market', 'title polymarketId');

    const total = await Trade.countDocuments(query);

    res.json({
      trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Get trade by ID
router.get('/:id', async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('trader', 'username walletAddress')
      .populate('market', 'title polymarketId')
      .populate('copiedFrom', 'trader amount price')
      .populate('copiedBy', 'trader amount price');

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json({ trade });
  } catch (error) {
    logger.error('Error fetching trade:', error);
    res.status(500).json({ error: 'Failed to fetch trade' });
  }
});

// Update trade status
router.put('/:id/status', async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const { status, profit, transactionHash } = req.body;

    if (!['open', 'won', 'lost', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    trade.status = status;
    if (profit !== undefined) trade.profit = profit;
    if (transactionHash) trade.transactionHash = transactionHash;
    if (status === 'won' || status === 'lost') {
      trade.closedAt = new Date();
    }

    await trade.save();

    // Update trader stats
    const trader = await User.findById(trade.trader);
    const allTrades = await Trade.find({ trader: trade.trader });
    await trader.updateStats(allTrades);

    res.json({
      message: 'Trade status updated successfully',
      trade,
    });
  } catch (error) {
    logger.error('Error updating trade status:', error);
    res.status(500).json({ error: 'Failed to update trade status' });
  }
});

// Get trade statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { traderId, period = '7d' } = req.query;

    if (!traderId) {
      return res.status(400).json({ error: 'Trader ID is required' });
    }

    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const trades = await Trade.find({
      trader: traderId,
      createdAt: { $gte: startDate },
    });

    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, t) => sum + t.amount, 0);
    const wonTrades = trades.filter(t => t.status === 'won');
    const lostTrades = trades.filter(t => t.status === 'lost');
    const winRate = totalTrades > 0 ? (wonTrades.length / totalTrades) * 100 : 0;
    const totalProfit = wonTrades.reduce((sum, t) => sum + t.profit, 0);
    const totalLoss = lostTrades.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      stats: {
        period,
        totalTrades,
        totalVolume,
        winRate: winRate.toFixed(2),
        totalProfit,
        totalLoss,
        netProfit: totalProfit - totalLoss,
        avgTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching trade statistics:', error);
    res.status(500).json({ error: 'Failed to fetch trade statistics' });
  }
});

export default router;

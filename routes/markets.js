import express from 'express';
import Market from '../models/Market.js';
import polymarketApi from '../services/polymarketApi.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Sync markets from Polymarket
router.post('/sync', async (req, res) => {
  try {
    const { limit = 100 } = req.body;

    logger.info(`Syncing markets from Polymarket (limit: ${limit})`);

    const markets = await polymarketApi.getMarkets({ limit });

    let syncedCount = 0;
    for (const marketData of markets) {
      const existingMarket = await Market.findOne({ polymarketId: marketData.id });

      const marketDoc = {
        polymarketId: marketData.id,
        title: marketData.title || marketData.question,
        description: marketData.description,
        question: marketData.question,
        category: marketData.tag_slug || 'other',
        outcomes: marketData.outcomes || [],
        endDate: marketData.end_date_iso ? new Date(marketData.end_date_iso) : null,
        status: marketData.active ? 'open' : 'closed',
        totalVolume: marketData.volume || 0,
        liquidity: marketData.liquidity || 0,
        imageUrl: marketData.image_url,
        slug: marketData.slug,
        tags: marketData.tags || [],
      };

      if (existingMarket) {
        await Market.findByIdAndUpdate(existingMarket._id, marketDoc);
      } else {
        await Market.create(marketDoc);
      }
      syncedCount++;
    }

    res.json({
      message: 'Markets synced successfully',
      syncedCount,
      totalMarkets: markets.length,
    });
  } catch (error) {
    logger.error('Error syncing markets:', error);
    res.status(500).json({ error: 'Failed to sync markets' });
  }
});

// Get all markets
router.get('/', async (req, res) => {
  try {
    const { category, status, limit = 50, page = 1, search } = req.query;

    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { question: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const markets = await Market.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Market.countDocuments(query);

    res.json({
      markets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching markets:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// Get market by ID
router.get('/:id', async (req, res) => {
  try {
    const market = await Market.findOne({ polymarketId: req.params.id });

    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    res.json({ market });
  } catch (error) {
    logger.error('Error fetching market:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
});

// Get market categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Market.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ categories });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;

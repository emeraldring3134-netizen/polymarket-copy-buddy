import express from 'express';
import CopyConfig from '../models/CopyConfig.js';
import configManager from '../services/configManager.js';
import riskControl from '../services/riskControl.js';
import { logger } from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get risk assessment for a trader
router.get('/trader/:traderId', async (req, res) => {
  try {
    const { traderId } = req.params;
    const assessment = await riskControl.assessTraderRisk(traderId);
    res.json({ assessment });
  } catch (error) {
    logger.error('Error assessing trader risk:', error);
    res.status(500).json({ error: 'Failed to assess trader risk' });
  }
});

// Get risk summary for a copy config
router.get('/config/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const data = await configManager.getConfigWithRisk(configId);
    res.json(data);
  } catch (error) {
    logger.error('Error getting config risk:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if a trade would comply with risk limits
router.post('/check-trade', async (req, res) => {
  try {
    const { configId, tradeAmount, traderTrade } = req.body;

    const config = await CopyConfig.findById(configId);
    if (!config) {
      return res.status(404).json({ error: 'Copy configuration not found' });
    }

    const check = await riskControl.checkTradeRisk(config, traderTrade || { amount: tradeAmount });
    res.json(check);
  } catch (error) {
    logger.error('Error checking trade risk:', error);
    res.status(500).json({ error: 'Failed to check trade risk' });
  }
});

// Auto-disable configs that exceeded limits
router.post('/auto-disable', async (req, res) => {
  try {
    const result = await configManager.autoDisableExceededLimits();
    res.json({
      message: 'Auto-disable check completed',
      ...result,
    });
  } catch (error) {
    logger.error('Error auto-disabling configs:', error);
    res.status(500).json({ error: 'Failed to auto-disable configs' });
  }
});

// Get user's overall risk statistics
router.get('/stats/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await configManager.getConfigStats(userId);
    res.json({ stats });
  } catch (error) {
    logger.error('Error getting user risk stats:', error);
    res.status(500).json({ error: 'Failed to get risk statistics' });
  }
});

export default router;

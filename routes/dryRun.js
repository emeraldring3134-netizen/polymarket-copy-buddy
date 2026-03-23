import express from 'express';
import dryRunService from '../services/dryRunService.js';
import CopyConfig from '../models/CopyConfig.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/dryrun/start
 * Start a dry run simulation for a copy config
 */
router.post('/start', async (req, res) => {
  try {
    const { configId } = req.body;

    if (!configId) {
      return res.status(400).json({ error: 'Config ID is required' });
    }

    // Check if dry run is enabled for this config
    const config = await CopyConfig.findById(configId);
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    if (!config.dryRun?.enabled) {
      return res.status(400).json({ 
        error: 'Dry run is not enabled for this config. Please enable it first.' 
      });
    }

    // Run dry run simulation
    const results = await dryRunService.runDryRun(configId);

    res.json({
      success: true,
      message: 'Dry run simulation completed successfully',
      results
    });
  } catch (error) {
    logger.error('Error starting dry run:', error);
    res.status(500).json({ error: 'Failed to start dry run' });
  }
});

/**
 * POST /api/dryrun/simulate
 * Simulate a single trade (for real-time dry run)
 */
router.post('/simulate', async (req, res) => {
  try {
    const { configId, tradeData } = req.body;

    if (!configId || !tradeData) {
      return res.status(400).json({ error: 'Config ID and trade data are required' });
    }

    // Simulate trade
    const result = await dryRunService.simulateTrade(configId, tradeData);

    res.json({
      success: true,
      message: 'Trade simulation completed',
      result
    });
  } catch (error) {
    logger.error('Error simulating trade:', error);
    res.status(500).json({ error: 'Failed to simulate trade' });
  }
});

/**
 * GET /api/dryrun/results/:configId
 * Get dry run results for a config
 */
router.get('/results/:configId', async (req, res) => {
  try {
    const { configId } = req.params;

    const results = await dryRunService.getDryRunResults(configId);

    if (!results) {
      return res.status(404).json({ 
        error: 'No dry run results found for this config' 
      });
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Error getting dry run results:', error);
    res.status(500).json({ error: 'Failed to get dry run results' });
  }
});

/**
 * POST /api/dryrun/reset/:configId
 * Reset dry run statistics for a config
 */
router.post('/reset/:configId', async (req, res) => {
  try {
    const { configId } = req.params;

    await dryRunService.resetDryRunStats(configId);

    res.json({
      success: true,
      message: 'Dry run statistics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting dry run stats:', error);
    res.status(500).json({ error: 'Failed to reset dry run stats' });
  }
});

/**
 * POST /api/dryrun/compare
 * Compare dry run results for multiple configs
 */
router.post('/compare', async (req, res) => {
  try {
    const { configIds } = req.body;

    if (!configIds || !Array.isArray(configIds) || configIds.length === 0) {
      return res.status(400).json({ error: 'Config IDs array is required' });
    }

    if (configIds.length > 10) {
      return res.status(400).json({ 
        error: 'Cannot compare more than 10 configs at once' 
      });
    }

    const results = await dryRunService.compareDryRuns(configIds);

    res.json({
      success: true,
      message: 'Comparison completed successfully',
      results
    });
  } catch (error) {
    logger.error('Error comparing dry runs:', error);
    res.status(500).json({ error: 'Failed to compare dry runs' });
  }
});

export default router;

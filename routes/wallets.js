import express from 'express';
import User from '../models/User.js';
import web3Service from '../services/web3Service.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/wallets
 * Get all trading wallets for the current user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get balances for all wallets
    const wallets = await Promise.all(
      user.tradingWallets.map(async (wallet) => {
        try {
          const balance = await web3Service.getBalance(wallet.address);
          return {
            ...wallet.toObject(),
            balance: parseFloat(balance)
          };
        } catch (error) {
          logger.error(`Error getting balance for wallet ${wallet.address}:`, error);
          return {
            ...wallet.toObject(),
            balance: 0,
            balanceError: true
          };
        }
      })
    );

    res.json({ 
      success: true,
      wallets: wallets
    });
  } catch (error) {
    logger.error('Error getting wallets:', error);
    res.status(500).json({ error: 'Failed to get wallets' });
  }
});

/**
 * POST /api/wallets
 * Add a new trading wallet
 */
router.post('/', async (req, res) => {
  try {
    const { address, label, minHoldings } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!web3Service.isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add wallet
    await user.addTradingWallet(address, label, minHoldings);

    // Get balance for the new wallet
    const balance = await web3Service.getBalance(address);

    const newWallet = user.tradingWallets[user.tradingWallets.length - 1];

    logger.info(`Added trading wallet ${address} for user ${userId}`);

    res.status(201).json({ 
      success: true,
      message: 'Trading wallet added successfully',
      wallet: {
        ...newWallet.toObject(),
        balance: parseFloat(balance)
      }
    });
  } catch (error) {
    if (error.message === 'Wallet already exists') {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error adding wallet:', error);
    res.status(500).json({ error: 'Failed to add wallet' });
  }
});

/**
 * DELETE /api/wallets/:address
 * Remove a trading wallet
 */
router.delete('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.removeTradingWallet(address);

    logger.info(`Removed trading wallet ${address} for user ${userId}`);

    res.json({ 
      success: true,
      message: 'Trading wallet removed successfully'
    });
  } catch (error) {
    if (error.message === 'Wallet not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Error removing wallet:', error);
    res.status(500).json({ error: 'Failed to remove wallet' });
  }
});

/**
 * PUT /api/wallets/:address/default
 * Set a trading wallet as default
 */
router.put('/:address/default', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.setDefaultTradingWallet(address);

    logger.info(`Set ${address} as default wallet for user ${userId}`);

    res.json({ 
      success: true,
      message: 'Default wallet updated successfully'
    });
  } catch (error) {
    if (error.message === 'Wallet not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Error setting default wallet:', error);
    res.status(500).json({ error: 'Failed to set default wallet' });
  }
});

/**
 * PUT /api/wallets/:address
 * Update trading wallet details
 */
router.put('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { label, minHoldings } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const wallet = user.tradingWallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Update wallet details
    if (label !== undefined) {
      wallet.label = label;
    }
    if (minHoldings !== undefined) {
      wallet.minHoldings = minHoldings;
    }

    await user.save();

    logger.info(`Updated wallet ${address} for user ${userId}`);

    res.json({ 
      success: true,
      message: 'Wallet updated successfully',
      wallet: wallet.toObject()
    });
  } catch (error) {
    logger.error('Error updating wallet:', error);
    res.status(500).json({ error: 'Failed to update wallet' });
  }
});

/**
 * GET /api/wallets/:address/balance
 * Get balance for a specific wallet
 */
router.get('/:address/balance', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const balance = await web3Service.getBalance(address);

    res.json({ 
      success: true,
      address: address,
      balance: parseFloat(balance)
    });
  } catch (error) {
    logger.error('Error getting wallet balance:', error);
    res.status(500).json({ error: 'Failed to get wallet balance' });
  }
});

export default router;

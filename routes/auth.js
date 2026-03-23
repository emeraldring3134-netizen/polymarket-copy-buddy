import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import web3Service from '../services/web3Service.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Register/Login with wallet
router.post('/wallet', async (req, res) => {
  try {
    const { walletAddress, username, email } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!web3Service.isValidAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (user) {
      // Update user info if provided
      if (username) user.username = username;
      if (email) user.email = email;
      await user.save();
    } else {
      if (!username) {
        return res.status(400).json({ error: 'Username is required for new users' });
      }

      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        username,
        email,
      });
      await user.save();
      logger.info(`New user registered: ${username}`);
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Success',
      token,
      user: {
        id: user._id,
        username: user.username,
        walletAddress: user.walletAddress,
        email: user.email,
        isTrader: user.isTrader,
        totalTrades: user.totalTrades,
        winRate: user.winRate,
        profitLoss: user.profitLoss,
      },
    });
  } catch (error) {
    logger.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token and get user
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        walletAddress: user.walletAddress,
        email: user.email,
        isTrader: user.isTrader,
        totalTrades: user.totalTrades,
        winRate: user.winRate,
        profitLoss: user.profitLoss,
      },
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;

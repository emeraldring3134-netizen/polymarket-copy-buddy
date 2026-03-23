import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/markets.js';
import traderRoutes from './routes/traders.js';
import copyRoutes from './routes/copy.js';
import tradeRoutes from './routes/trades.js';
import encryptionRoutes from './routes/encryption.js';
import walletRoutes from './routes/wallets.js';
import dryRunRoutes from './routes/dryRun.js';
import { startMonitoring } from './services/copyMonitor.js';
import memoryProtection from './services/memoryProtection.js';
import web3Service from './services/web3Service.js';
import websocketListener from './services/websocketListener.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/polymarket-copy-trading';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io globally accessible
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/traders', traderRoutes);
app.use('/api/copy', copyRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/encryption', encryptionRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/dryrun', dryRunRoutes);

// Health check
app.get('/health', (req, res) => {
  const memoryStats = memoryProtection.getStats();
  const wsStatus = websocketListener.getStatus();
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    memoryProtection: {
      active: memoryStats.totalProtected > 0,
      protectedCount: memoryStats.totalProtected
    },
    websocket: wsStatus
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// MongoDB connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    startMonitoring(io); // Start copy trading monitoring
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Setup memory protection exit handlers
memoryProtection.setupExitHandlers(() => {
  logger.info('Performing final cleanup...');
  web3Service.cleanup();
  websocketListener.disconnect();
  io.close();
});

export { io };

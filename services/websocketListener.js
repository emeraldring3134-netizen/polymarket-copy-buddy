import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

class WebSocketListener {
  constructor() {
    this.provider = null;
    this.wsProvider = null;
    this.listeners = new Map(); // walletAddress -> Set of callbacks
    this.subscriptions = new Map(); // walletAddress -> subscriptionId
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
  }

  /**
   * Connect to WebSocket provider
   */
  async connect() {
    try {
      // Use WebSocket RPC URL
      const wsUrl = POLYGON_RPC_URL.replace('https://', 'wss://').replace('http://', 'ws://');
      
      this.wsProvider = new ethers.WebSocketProvider(wsUrl);
      
      // Wait for connection
      await this.wsProvider.waitForReady(30000);
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info('WebSocket listener connected successfully');
      
      // Setup error handling
      this.wsProvider.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.handleDisconnect();
      });
      
      this.wsProvider.on('close', () => {
        logger.warn('WebSocket connection closed');
        this.handleDisconnect();
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to connect WebSocket:', error);
      this.handleDisconnect();
      return false;
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  async handleDisconnect() {
    this.isConnected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
      await this.connect();
    } else {
      logger.error('Max reconnection attempts reached. Please check network connection.');
    }
  }

  /**
   * Subscribe to wallet transactions
   */
  async subscribeToWallet(walletAddress, callback) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (!this.listeners.has(walletAddress)) {
        this.listeners.set(walletAddress, new Set());
      }
      
      this.listeners.get(walletAddress).add(callback);
      
      logger.info(`Subscribed to wallet: ${walletAddress}`);
      
      // If first subscription for this wallet, set up blockchain monitoring
      if (this.listeners.get(walletAddress).size === 1) {
        await this.startMonitoringWallet(walletAddress);
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to subscribe to wallet ${walletAddress}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from wallet transactions
   */
  async unsubscribeFromWallet(walletAddress) {
    try {
      this.listeners.delete(walletAddress);
      
      if (this.subscriptions.has(walletAddress)) {
        const subscriptionId = this.subscriptions.get(walletAddress);
        await this.wsProvider.removeAllListeners(subscriptionId);
        this.subscriptions.delete(walletAddress);
      }
      
      logger.info(`Unsubscribed from wallet: ${walletAddress}`);
      return true;
    } catch (error) {
      logger.error(`Failed to unsubscribe from wallet ${walletAddress}:`, error);
      return false;
    }
  }

  /**
   * Start monitoring a wallet for transactions
   */
  async startMonitoringWallet(walletAddress) {
    try {
      // Monitor new blocks and check for transactions involving this wallet
      const filter = {
        address: walletAddress
      };

      const subscription = await this.wsProvider.on(filter, (log) => {
        this.handleTransaction(walletAddress, log);
      });

      this.subscriptions.set(walletAddress, subscription);
      
      logger.info(`Started monitoring wallet: ${walletAddress}`);
    } catch (error) {
      logger.error(`Failed to start monitoring wallet ${walletAddress}:`, error);
    }
  }

  /**
   * Handle transaction from monitored wallet
   */
  async handleTransaction(walletAddress, log) {
    try {
      logger.info(`Transaction detected for wallet ${walletAddress}: ${log.transactionHash}`);

      // Decode transaction to extract trade information
      const tradeInfo = await this.decodeTrade(log);
      
      if (tradeInfo) {
        // Notify all listeners for this wallet
        const callbacks = this.listeners.get(walletAddress);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback({
                type: 'trade',
                walletAddress,
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber,
                timestamp: Date.now(),
                trade: tradeInfo
              });
            } catch (error) {
              logger.error('Error in callback:', error);
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error handling transaction:', error);
    }
  }

  /**
   * Decode transaction to extract trade information
   */
  async decodeTrade(log) {
    try {
      // This is a simplified implementation
      // In production, you would decode the actual Polymarket contract calls
      
      // Parse basic transaction info
      const transaction = {
        from: log.from,
        to: log.to,
        value: ethers.formatEther(log.value || '0'),
        data: log.data
      };

      // TODO: Decode Polymarket specific trade data
      // This would involve:
      // 1. Parsing the function signature
      // 2. Decoding the parameters
      // 3. Extracting market ID, outcome ID, amount, etc.
      
      // For now, return basic transaction info
      return {
        type: 'trade',
        amount: parseFloat(transaction.value),
        timestamp: Date.now(),
        rawData: transaction
      };
    } catch (error) {
      logger.error('Error decoding trade:', error);
      return null;
    }
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscribedWallets: Array.from(this.listeners.keys()),
      subscriptionCount: this.listeners.size
    };
  }

  /**
   * Disconnect from WebSocket
   */
  async disconnect() {
    try {
      if (this.wsProvider) {
        // Clear all subscriptions
        for (const [walletAddress] of this.subscriptions) {
          await this.unsubscribeFromWallet(walletAddress);
        }
        
        // Close connection
        await this.wsProvider.destroy();
        this.wsProvider = null;
      }
      
      this.isConnected = false;
      this.listeners.clear();
      this.subscriptions.clear();
      
      logger.info('WebSocket listener disconnected');
    } catch (error) {
      logger.error('Error disconnecting WebSocket:', error);
    }
  }

  /**
   * Subscribe to new blocks (for monitoring market changes)
   */
  async subscribeToNewBlocks(callback) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      this.wsProvider.on('block', (blockNumber) => {
        try {
          callback({
            type: 'block',
            blockNumber,
            timestamp: Date.now()
          });
        } catch (error) {
          logger.error('Error in block callback:', error);
        }
      });

      logger.info('Subscribed to new blocks');
      return true;
    } catch (error) {
      logger.error('Failed to subscribe to new blocks:', error);
      return false;
    }
  }
}

export default new WebSocketListener();

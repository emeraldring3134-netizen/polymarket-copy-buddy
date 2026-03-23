# 安全问题整改方案

## ⚠️ 当前安全漏洞等级: 严重

本文档提供了具体的安全整改代码和实施步骤。

## 一、后端整改代码

### 1. 修改 web3Service.js (移除私钥管理)

创建新的安全版本:

```javascript
import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

class Web3Service {
  constructor() {
    if (!POLYGON_RPC_URL) {
      throw new Error('POLYGON_RPC_URL is required');
    }
    this.provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    // ✅ 不再存储 signer,不在服务器端管理私钥
  }

  /**
   * ✅ 广播已签名的交易(新方法)
   * @param {string} signedTx - 已签名的交易哈希
   * @returns {Object} 交易回执
   */
  async broadcastTransaction(signedTx) {
    try {
      logger.info('Broadcasting transaction...');
      const tx = await this.provider.broadcastTransaction(signedTx);
      logger.info(`Transaction broadcasted: ${tx}`);

      // 等待交易确认
      const receipt = await this.provider.waitForTransaction(tx, 1);
      logger.info(`Transaction confirmed in block ${receipt.blockNumber}`);

      return {
        hash: tx,
        receipt: {
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          gasUsed: receipt.gasUsed.toString()
        }
      };
    } catch (error) {
      logger.error('Error broadcasting transaction:', error);
      throw error;
    }
  }

  /**
   * ✅ 预估gas费用
   */
  async estimateGas(transaction) {
    try {
      const gasEstimate = await this.provider.estimateGas(transaction);
      logger.debug(`Gas estimate: ${gasEstimate}`);
      return gasEstimate;
    } catch (error) {
      logger.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * ✅ 查询余额
   */
  async getBalance(address) {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address');
      }
      const balance = await this.provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      logger.debug(`Balance for ${address}: ${formattedBalance} ETH`);
      return formattedBalance;
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * ✅ 构造交易数据(供前端签名)
   */
  async buildTransactionData(to, value, data = '0x') {
    try {
      logger.info('Building transaction data...');
      const tx = {
        to: to,
        value: ethers.parseEther(value.toString()),
        data: data,
        gasLimit: await this.estimateGas({ to, value, data }),
        chainId: await this.provider.getNetwork().then(n => Number(n.chainId)),
        nonce: await this.provider.getTransactionCount(to, 'pending')
      };

      logger.debug('Transaction data built successfully');
      return tx;
    } catch (error) {
      logger.error('Error building transaction:', error);
      throw error;
    }
  }

  /**
   * ✅ 验证地址格式
   */
  isValidAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * ✅ 格式化地址显示
   */
  formatAddress(address, length = 6) {
    if (!this.isValidAddress(address)) return address;
    return `${address.substring(0, 2 + length)}...${address.substring(address.length - length)}`;
  }

  /**
   * ✅ 获取交易回执
   */
  async getTransactionReceipt(txHash) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      return receipt;
    } catch (error) {
      logger.error('Error getting transaction receipt:', error);
      throw error;
    }
  }

  /**
   * ✅ 获取网络信息
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      return {
        chainId: Number(network.chainId),
        name: network.name
      };
    } catch (error) {
      logger.error('Error getting network info:', error);
      throw error;
    }
  }

  // ❌ 删除: sendTransaction 方法(不再需要私钥)
  // ❌ 删除: setWallet 方法(不再在服务器管理钱包)
}

export default new Web3Service();
```

### 2. 新增交易路由 (routes/trades-build.js)

```javascript
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import web3Service from '../services/web3Service.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

/**
 * ✅ 构造交易数据(供前端签名)
 */
router.post('/build', async (req, res) => {
  try {
    const {
      to,           // 接收地址
      value,         // 金额
      data,          // 交易数据
      tradeId        // 交易ID
    } = req.body;

    // 验证参数
    if (!to || !value) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!web3Service.isValidAddress(to)) {
      return res.status(400).json({ error: 'Invalid recipient address' });
    }

    // 构造交易数据
    const transaction = await web3Service.buildTransactionData(
      to,
      value,
      data || '0x'
    );

    logger.info(`Transaction built for trade ${tradeId}`);

    res.json({
      transaction,
      tradeId,
      network: await web3Service.getNetworkInfo()
    });
  } catch (error) {
    logger.error('Error building transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✅ 提交已签名的交易
 */
router.post('/:tradeId/submit', async (req, res) => {
  try {
    const { tradeId } = req.params;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }

    logger.info(`Submitting signed transaction for trade ${tradeId}: ${txHash}`);

    // 这里可以更新交易状态
    // const trade = await Trade.findById(tradeId);
    // trade.transactionHash = txHash;
    // trade.status = 'pending';
    // await trade.save();

    res.json({
      message: 'Transaction submitted successfully',
      txHash
    });
  } catch (error) {
    logger.error('Error submitting transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✅ 广播交易到区块链
 */
router.post('/broadcast', async (req, res) => {
  try {
    const { signedTx } = req.body;

    if (!signedTx) {
      return res.status(400).json({ error: 'Signed transaction is required' });
    }

    logger.info('Broadcasting transaction to blockchain...');

    const result = await web3Service.broadcastTransaction(signedTx);

    res.json({
      message: 'Transaction broadcasted successfully',
      ...result
    });
  } catch (error) {
    logger.error('Error broadcasting transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3. 更新 server.js (移除私钥相关配置)

```javascript
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
import tradeBuildRoutes from './routes/trades-build.js'; // ✅ 新增
import { startMonitoring } from './services/copyMonitor.js';
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
app.use('/api/trades', tradeBuildRoutes); // ✅ 新增交易构建路由

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  logger.info('✅ Security mode: Client-side signing enabled');
});

export { io };
```

### 4. 更新 .env.example (移除私钥配置)

```env
# Environment Configuration
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/polymarket-copy-trading

# JWT Secret
JWT_SECRET=your-jwt-secret-key-change-this-in-production

# Polymarket API
POLYMARKET_API=https://api.polymarket.com

# Polygon Network
POLYGON_RPC_URL=https://polygon-rpc.com

# ❌ 删除: 不再在服务器端存储私钥
# PRIVATE_KEY=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Copy Trading Settings
DEFAULT_COPY_RATIO=0.5
MIN_TRADE_AMOUNT=1
MAX_TRADE_AMOUNT=1000

# WebSocket
WS_PORT=3001

# ✅ 新增: 安全配置
SECURITY_MODE=client-signing  # 客户端签名模式(推荐)
# SECURITY_MODE=server-signing  # 服务器签名模式(不推荐,仅测试用)
```

## 二、前端整改代码

### 1. 创建交易签名服务

创建 `client/src/services/txSigner.js`:

```javascript
import { ethers } from 'ethers';
import { api } from './api';

class TransactionSigner {
  /**
   * ✅ 检查是否连接钱包
   */
  async isConnected() {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_accounts'
    });

    return accounts.length > 0;
  }

  /**
   * ✅ 连接钱包
   */
  async connectWallet() {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    return {
      address: accounts[0],
      chainId: Number(network.chainId),
      chainName: network.name
    };
  }

  /**
   * ✅ 签名并发送交易(完整流程)
   */
  async signAndSendTrade(tradeData) {
    try {
      console.log('🔐 Starting client-side signing...');

      // 1. 检查钱包连接
      const connected = await this.isConnected();
      if (!connected) {
        await this.connectWallet();
      }

      // 2. 获取签名器
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      console.log(`✅ Wallet connected: ${address}`);

      // 3. 从后端获取交易数据
      console.log('📡 Fetching transaction data from server...');
      const response = await api.post('/trades/build', {
        ...tradeData,
        tradeId: tradeData.id || Date.now().toString()
      });

      const { transaction, network, tradeId } = response.data;
      console.log(`✅ Transaction data received for network: ${network.name}`);

      // 4. 检查网络
      const currentNetwork = await provider.getNetwork();
      if (Number(currentNetwork.chainId) !== network.chainId) {
        throw new Error(`Please switch to network: ${network.name}`);
      }

      // 5. 用户确认并签名
      console.log('✍️  Waiting for user signature...');
      const tx = await signer.sendTransaction(transaction);

      console.log(`✅ Transaction signed: ${tx.hash}`);

      // 6. 通知服务器交易已发送
      await api.post(`/trades/${tradeId}/submit`, {
        txHash: tx.hash
      });

      console.log('📤 Transaction submitted to server');

      // 7. 等待确认
      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();

      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Error in signAndSendTrade:', error);
      throw error;
    }
  }

  /**
   * ✅ 仅签名交易(不发送)
   */
  async signTransaction(transaction) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const signedTx = await signer.signTransaction(transaction);
      return signedTx;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * ✅ 广播已签名的交易
   */
  async broadcastSignedTransaction(signedTx) {
    try {
      const response = await api.post('/trades/broadcast', {
        signedTx
      });

      return response.data;
    } catch (error) {
      console.error('Error broadcasting transaction:', error);
      throw error;
    }
  }

  /**
   * ✅ 查询余额
   */
  async getBalance(address) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * ✅ 签名消息
   */
  async signMessage(message) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  /**
   * ✅ 验证签名
   */
  verifySignature(message, signature, address) {
    try {
      const recovered = ethers.verifyMessage(message, signature);
      return recovered.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
}

export default new TransactionSigner();
```

### 2. 更新创建交易逻辑

修改 `client/src/services/api.js`:

```javascript
// 在现有的 tradesApi 对象中添加新方法

export const tradesApi = {
  // ... 现有方法

  /**
   * ✅ 构造交易数据(客户端签名)
   */
  buildTransaction: async (tradeData) => {
    const response = await api.post('/trades/build', tradeData);
    return response.data;
  },

  /**
   * ✅ 提交已签名的交易
   */
  submitSignedTransaction: async (tradeId, txHash) => {
    const response = await api.post(`/trades/${tradeId}/submit`, { txHash });
    return response.data;
  },

  /**
   * ✅ 广播交易到区块链
   */
  broadcastTransaction: async (signedTx) => {
    const response = await api.post('/trades/broadcast', { signedTx });
    return response.data;
  }
};
```

### 3. 更新跟单监控服务

修改 `services/copyMonitor.js`:

```javascript
// ... 现有导入

async function executeCopyTrade(follower, trader, traderTrade, copyAmount, config) {
  try {
    logger.info(`Preparing copy trade for ${follower.username} following ${trader.username}`);

    // ❌ 删除: 不再在服务器端执行交易
    // const copyTrade = new Trade({ ... });

    // ✅ 新增: 创建待确认的交易记录
    const copyTrade = new Trade({
      polymarketId: traderTrade.polymarketId,
      trader: follower._id,
      market: traderTrade.market,
      outcomeId: traderTrade.outcomeId,
      outcomeName: traderTrade.outcomeName,
      amount: copyAmount,
      price: traderTrade.price,
      shares: copyAmount / traderTrade.price,
      direction: traderTrade.direction,
      status: 'pending',  // ✅ 等待用户在客户端签名确认
      copiedFrom: traderTrade._id,
    });

    await copyTrade.save();

    // ✅ 新增: 通过 WebSocket 通知客户端需要确认的交易
    if (io) {
      io.to(`user-${follower._id}`).emit('trade-pending', {
        tradeId: copyTrade._id,
        originalTradeId: traderTrade._id,
        marketTitle: traderTrade.market.title,
        amount: copyAmount,
        price: traderTrade.price,
        direction: traderTrade.direction,
        // ✅ 发送交易数据供客户端签名
        transactionData: {
          to: traderTrade.market.contractAddress,
          value: copyAmount.toString(),
          data: traderTrade.market.tradeData
        },
        timestamp: new Date(),
      });
    }

    logger.info(`✅ Pending trade created and notified client: ${copyTrade._id}`);

    // 不再自动执行交易,等待客户端确认
    return copyTrade;
  } catch (error) {
    logger.error('Error creating pending trade:', error);
    throw error;
  }
}

// ✅ 新增: 处理客户端交易确认
async function handleTradeConfirmation(tradeId, txHash) {
  try {
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      throw new Error('Trade not found');
    }

    logger.info(`✅ Trade confirmed by client: ${tradeId}, tx: ${txHash}`);

    // 更新交易状态
    trade.status = 'pending';
    trade.transactionHash = txHash;
    await trade.save();

    // 广播到区块链
    const web3Service = (await import('./web3Service.js')).default;
    // 注意: 这里需要从客户端获取已签名的交易
    // 实际上应该在前端就广播,这里只是记录状态

    logger.info(`Trade status updated to pending: ${tradeId}`);
  } catch (error) {
    logger.error('Error handling trade confirmation:', error);
    throw error;
  }
}

export { handleTradeConfirmation };
```

### 4. 创建交易确认组件

创建 `client/src/components/TradeConfirmModal.jsx`:

```jsx
import React, { useState } from 'react';
import txSigner from '../services/txSigner';

function TradeConfirmModal({ trade, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');

      // 使用客户端签名
      const result = await txSigner.signAndSendTrade({
        id: trade.tradeId,
        to: trade.transactionData.to,
        value: trade.amount,
        data: trade.transactionData.data
      });

      onConfirm(trade.tradeId, result.hash);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>确认跟单交易</h3>

        <div className="trade-details">
          <div><strong>市场:</strong> {trade.marketTitle}</div>
          <div><strong>金额:</strong> {trade.amount} ETH</div>
          <div><strong>价格:</strong> {(trade.price * 100).toFixed(1)}%</div>
          <div><strong>方向:</strong> {trade.direction.toUpperCase()}</div>
        </div>

        <div className="security-notice">
          ⚠️ 此交易将在您的 MetaMask 钱包中签名
          <br />
          ✅ 私钥永不离开您的设备
        </div>

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? '签名中...' : '确认并签名'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradeConfirmModal;
```

## 三、实施步骤

### 步骤1: 备份现有代码
```bash
cp -r . ../polymarket-backup-$(date +%Y%m%d)
```

### 步骤2: 替换后端文件
```bash
# 1. 替换 web3Service.js
mv services/web3Service.js services/web3Service.js.old
# 创建新版本的 web3Service.js (使用上面的代码)

# 2. 创建新的路由文件
# 创建 routes/trades-build.js (使用上面的代码)

# 3. 更新 server.js
# 添加 tradeBuildRoutes

# 4. 更新 .env.example
# 删除 PRIVATE_KEY 配置
```

### 步骤3: 更新前端代码
```bash
cd client

# 1. 创建交易签名服务
# 创建 src/services/txSigner.js

# 2. 更新 API 服务
# 修改 src/services/api.js

# 3. 创建交易确认组件
# 创建 src/components/TradeConfirmModal.jsx
```

### 步骤4: 测试验证
```bash
# 启动后端
npm start

# 启动前端
cd client
npm run dev

# 测试流程:
# 1. 创建跟单配置
# 2. 等待交易员有新交易
# 3. 在前端收到待确认通知
# 4. 在 MetaMask 中签名确认
# 5. 验证交易是否成功
```

### 步骤5: 安全审计
```bash
# 检查日志中是否有私钥泄露
grep -r "private" logs/ --exclude-dir=node_modules

# 检查代码中是否有硬编码私钥
grep -r "0x[a-fA-F0-9]\{64\}" . --exclude-dir=node_modules --exclude-dir=.git

# 检查环境变量文件
cat .env | grep -i "key"
```

## 四、安全检查清单

实施完成后,请确认以下安全措施:

- [ ] ✅ 删除了所有服务器端私钥存储
- [ ] ✅ 交易签名移到客户端执行
- [ ] ✅ 私钥不出现在任何日志文件中
- [ ] ✅ .env 文件不包含私钥配置
- [ ] ✅ 代码中没有硬编码私钥
- [ ] ✅ 用户通过 MetaMask 签名交易
- [ ] ✅ 服务器只广播已签名的交易
- [ ] ✅ 实施了自定义跟单钱包地址功能
- [ ] ✅ 所有敏感操作需要用户确认
- [ ] ✅ 完成了安全审计

## 五、后续优化建议

1. **硬件钱包支持**
   - 集成 Ledger, Trezor 等硬件钱包
   - 提供最高级别的安全保护

2. **多重签名**
   - 实施多重签名钱包
   - 需要多个签名确认交易

3. **密钥管理系统**
   - 如果需要服务器签名,使用 AWS KMS
   - 或 Hashicorp Vault

4. **安全监控**
   - 实时监控可疑活动
   - 异常行为告警

5. **用户教育**
   - 提供安全使用指南
   - 告知最佳实践

---

**重要**: 此整改方案是必须执行的,当前代码存在严重安全漏洞!

**优先级**: 🔴 最高,立即实施

**预计时间**: 2-4 小时

**风险等级**: 实施前:🔴 极高 | 实施后:🟢 低

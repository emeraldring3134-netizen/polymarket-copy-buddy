# 钱包安全机制说明文档

## 一、私钥存储现状与风险分析

### ⚠️ 当前实现的安全问题

**当前实现存在严重安全漏洞!**

查看 `web3Service.js` 第 43-46 行:
```javascript
async sendTransaction(transaction, privateKey) {
  try {
    this.setWallet(privateKey);  // ⚠️ 私钥直接传入,明文存储在内存
    const tx = await this.signer.sendTransaction(transaction);
    // ...
  }
}
```

查看 `.env.example` 第 18 行:
```env
# Wallet Configuration (Optional - for server-side operations)
PRIVATE_KEY=  # ⚠️ 私钥明文存储在环境变量中!
```

### 🔴 安全风险清单

1. **私钥明文存储**
   - ❌ 环境变量中的私钥未加密
   - ❌ 进程内存中私钥明文存在
   - ❌ 日志文件可能泄露私钥

2. **木马窃取风险**
   - ❌ 读取 `.env` 文件即可获取私钥
   - ❌ 内存dump可以提取私钥
   - ❌ 进程监控可以捕获私钥
   - ❌ 日志中可能记录私钥

3. **数据库安全**
   - ❌ 如果私钥存入数据库,未加密
   - ❌ 数据库备份包含私钥

4. **传输安全**
   - ❌ 私钥通过网络传输(如果使用外部API)

## 二、推荐的安全实施方案

### 方案1: 客户端签名 (推荐,最安全)

**原理**: 私钥永远不离开用户设备,所有交易在前端签名

#### 架构图
```
用户浏览器 (MetaMask)
    ↓
签名交易 (私钥在用户设备)
    ↓
发送签名后的交易到服务器
    ↓
服务器广播到区块链
```

#### 优势
✅ 私钥100%由用户控制
✅ 服务器无法获取私钥
✅ 木马无法从服务器窃取私钥
✅ 符合 Web3 去中心化原则

#### 实现示例

**后端 - 修改 web3Service.js**
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
    // ❌ 不再存储 signer,不在服务器端管理私钥
  }

  // ✅ 新增: 广播已签名的交易
  async broadcastTransaction(signedTx) {
    try {
      const tx = await this.provider.broadcastTransaction(signedTx);
      logger.info(`Transaction broadcasted: ${tx}`);
      return {
        hash: tx,
        // 等待确认
        receipt: await this.provider.waitForTransaction(tx, 1)
      };
    } catch (error) {
      logger.error('Error broadcasting transaction:', error);
      throw error;
    }
  }

  // ✅ 仅用于查询,不涉及私钥
  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  // ✅ 预估gas,不需要私钥
  async estimateGas(transaction) {
    try {
      const gasEstimate = await this.provider.estimateGas(transaction);
      return gasEstimate;
    } catch (error) {
      logger.error('Error estimating gas:', error);
      throw error;
    }
  }

  // ❌ 删除: sendTransaction 方法(不再需要私钥)
  // async sendTransaction(transaction, privateKey) { ... }

  // ✅ 新增: 构造交易数据(供前端签名)
  async buildTransactionData(to, value, data = '0x') {
    try {
      const tx = {
        to: to,
        value: ethers.parseEther(value.toString()),
        data: data,
        gasLimit: await this.estimateGas({ to, value, data }),
        chainId: await this.provider.getNetwork().then(n => Number(n.chainId)),
        nonce: await this.provider.getTransactionCount(to, 'pending')
      };
      return tx;
    } catch (error) {
      logger.error('Error building transaction:', error);
      throw error;
    }
  }

  // ... 其他只读方法保持不变
}

export default new Web3Service();
```

**前端 - 创建交易签名服务**

创建 `client/src/services/txSigner.js`:
```javascript
import { ethers } from 'ethers';
import { api } from './api';

class TransactionSigner {
  /**
   * 客户端签名交易并发送
   */
  async signAndSendTrade(tradeData) {
    try {
      // 1. 从后端获取交易数据
      const response = await api.post('/trades/build', tradeData);
      const { transaction, tradeId } = response.data;

      // 2. 使用 MetaMask 签名
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 3. 用户确认并签名
      const signedTx = await signer.sendTransaction(transaction);

      // 4. 通知服务器交易已发送
      await api.post(`/trades/${tradeId}/submit`, {
        txHash: signedTx.hash
      });

      // 5. 等待确认
      const receipt = await signedTx.wait();

      return {
        hash: receipt.hash,
        status: receipt.status,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * 获取用户签名授权(可选,用于自动跟单)
   * 注意: 需要用户一次性授权多个交易
   */
  async requestAutoTradePermission(spender, amount) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // ERC20 approve (如果需要)
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function approve(address,uint256) returns (bool)'],
        signer
      );

      const tx = await tokenContract.approve(spender, ethers.parseUnits(amount, 18));
      await tx.wait();

      console.log('Auto-trade permission granted');
    } catch (error) {
      console.error('Error granting permission:', error);
      throw error;
    }
  }
}

export default new TransactionSigner();
```

### 方案2: 硬件钱包签名 (最安全,专业推荐)

**原理**: 使用硬件钱包(Ledger, Trezor)签名,私钥永不离开设备

```javascript
import { LedgerSigner } from '@ethersproject/hardware-wallets';

async function signWithLedger(transaction) {
  // 连接 Ledger 设备
  const signer = new LedgerSigner(provider);
  const signedTx = await signer.sendTransaction(transaction);
  return signedTx;
}
```

### 方案3: 密钥管理系统 (如果必须在服务器管理)

**原理**: 使用专业密钥管理系统,私钥加密存储

#### 使用 AWS KMS
```javascript
import AWS from 'aws-sdk';

const kms = new AWS.KMS({
  region: 'us-east-1'
});

// 加密存储私钥
async function encryptPrivateKey(privateKey) {
  const result = await kms.encrypt({
    KeyId: 'alias/polymarket-signing-key',
    Plaintext: Buffer.from(privateKey)
  }).promise();

  return result.CiphertextBlob.toString('base64');
}

// 解密私钥(仅在使用时)
async function decryptPrivateKey(encryptedKey) {
  const result = await kms.decrypt({
    CiphertextBlob: Buffer.from(encryptedKey, 'base64')
  }).promise();

  return result.Plaintext.toString();
}

// 签名交易
async function signTransaction(transaction, encryptedKey) {
  const privateKey = await decryptPrivateKey(encryptedKey);
  const wallet = new ethers.Wallet(privateKey);
  const signedTx = await wallet.signTransaction(transaction);
  return signedTx;
}
```

#### 使用 Hashicorp Vault
```javascript
import NodeVault from 'node-vault';

const vault = NodeVault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

// 存储私钥到 Vault
await vault.write('secret/polymarket/signing-key', {
  value: privateKey
});

// 从 Vault 读取私钥
const result = await vault.read('secret/polymarket/signing-key');
const privateKey = result.data.value;
```

## 三、跟单参数详细说明

### 📋 完整参数列表

#### 基础参数

| 参数名 | 类型 | 默认值 | 说明 | 范围 |
|--------|------|--------|------|------|
| `copyRatio` | Number | 0.5 | 跟单比例 | 0.01 - 2.0 |
| `minTradeAmount` | Number | 1 | 最小跟单金额 | >= 1 |
| `maxTradeAmount` | Number | 1000 | 最大跟单金额 | >= minTradeAmount |
| `enabled` | Boolean | true | 是否启用 | true/false |

#### 风险控制参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `stopLossPercentage` | Number | null | 止损百分比 (0-100) |
| `takeProfitPercentage` | Number | null | 止盈百分比 (0-100) |
| `onlyProfitableMarkets` | Boolean | false | 仅跟单盈利市场 |

#### 每日限额参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxDailyTrades` | Number | 10 | 每日最大跟单次数 |
| `maxDailyAmount` | Number | 1000 | 每日最大跟单金额 |

#### 市场过滤参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `excludedCategories` | Array | [] | 排除的市场分类 |
| `onlyInCategories` | Array | [] | 仅跟单的分类 |

### 📊 参数使用示例

#### 保守型配置
```javascript
{
  copyRatio: 0.3,              // 只跟单30%
  minTradeAmount: 5,           // 最小5
  maxTradeAmount: 50,          // 最大50
  maxDailyTrades: 5,           // 每日最多5笔
  maxDailyAmount: 100,         // 每日最多100
  stopLossPercentage: 10,      // 亏损10%自动停止
  excludedCategories: ['politics'], // 排除政治类
  enabled: true
}
```

#### 激进型配置
```javascript
{
  copyRatio: 1.5,              // 跟单150%
  minTradeAmount: 10,
  maxTradeAmount: 500,
  maxDailyTrades: 20,
  maxDailyAmount: 2000,
  stopLossPercentage: null,    // 不设止损
  takeProfitPercentage: 100,   // 盈利100%自动止盈
  enabled: true
}
```

#### 平衡型配置
```javascript
{
  copyRatio: 0.5,              // 跟单50%
  minTradeAmount: 10,
  maxTradeAmount: 200,
  maxDailyTrades: 10,
  maxDailyAmount: 500,
  stopLossPercentage: 20,      // 止损20%
  takeProfitPercentage: 50,    // 止盈50%
  onlyInCategories: ['crypto', 'sports'], // 仅限加密和体育
  enabled: true
}
```

## 四、关于跟单钱包地址

### ❌ 当前不支持自定义跟单钱包地址

**原因分析**:
1. 当前设计:用户钱包地址 = 跟单钱包地址
2. 数据库模型中只有 `walletAddress` 一个字段
3. 跟单时直接使用用户关联的钱包地址

### ✅ 支持自定义钱包地址的实现方案

#### 方案A: 扩展用户模型(推荐)

**1. 修改 User 模型**

创建 `models/User.js` 增强版:
```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    trim: true,
    lowercase: true
  },
  // ✅ 新增: 交易钱包地址(可以自定义)
  tradingWallets: [{
    walletAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    label: {
      type: String,  // 钱包标签,如"主钱包"、"跟单钱包"
      default: 'Default'
    },
    isDefault: {
      type: Boolean,  // 是否为默认跟单钱包
      default: false
    },
    balance: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isTrader: {
    type: Boolean,
    default: false
  },
  totalTrades: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalVolume: {
    type: Number,
    default: 0
  },
  avgTradeSize: {
    type: Number,
    default: 0
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  settings: {
    allowCopying: {
      type: Boolean,
      default: true
    },
    minFollowAmount: {
      type: Number,
      default: 1
    },
    // ✅ 新增: 跟单设置
    copyTrading: {
      defaultTradingWallet: String,  // 默认跟单钱包地址
      requireApproval: {
        type: Boolean,
        default: true  // 是否需要每次手动确认
      },
      autoConfirmAmount: {
        type: Number,  // 以下金额自动确认
        default: 0
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ 新增: 获取默认跟单钱包
userSchema.methods.getDefaultTradingWallet = function() {
  const defaultWallet = this.tradingWallets.find(w => w.isDefault);
  if (defaultWallet) {
    return defaultWallet.walletAddress;
  }
  // 如果没有设置默认,返回主钱包
  return this.walletAddress;
};

// ✅ 新增: 添加交易钱包
userSchema.methods.addTradingWallet = function(walletAddress, label = 'Custom Wallet') {
  // 检查钱包地址格式
  if (!ethers.isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }

  // 检查是否已存在
  const exists = this.tradingWallets.find(w => w.walletAddress === walletAddress);
  if (exists) {
    throw new Error('Wallet already added');
  }

  // 添加钱包
  this.tradingWallets.push({
    walletAddress,
    label,
    isDefault: this.tradingWallets.length === 0
  });

  return this.save();
};

// ✅ 新增: 设置默认跟单钱包
userSchema.methods.setDefaultTradingWallet = function(walletAddress) {
  const wallet = this.tradingWallets.find(w => w.walletAddress === walletAddress);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  // 取消其他钱包的默认设置
  this.tradingWallets.forEach(w => w.isDefault = false);
  wallet.isDefault = true;

  return this.save();
};

export default mongoose.model('User', userSchema);
```

**2. 修改 CopyConfig 模型**

```javascript
import mongoose from 'mongoose';

const copyConfigSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ✅ 新增: 跟单使用的钱包地址
  tradingWalletAddress: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  copyRatio: {
    type: Number,
    required: true,
    min: 0.01,
    max: 2.0,
    default: 0.5
  },
  // ... 其他参数保持不变
});
```

**3. 新增钱包管理 API**

创建 `routes/wallets.js`:
```javascript
import express from 'express';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import web3Service from '../services/web3Service.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// 获取用户所有交易钱包
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      wallets: user.tradingWallets.map(w => ({
        ...w.toObject(),
        balance: w.balance // 实时查询区块链余额
      }))
    });
  } catch (error) {
    logger.error('Error fetching wallets:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// 添加交易钱包
router.post('/', async (req, res) => {
  try {
    const { walletAddress, label } = req.body;

    // 验证钱包地址
    if (!web3Service.isValidAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const user = await User.findById(req.user._id);
    await user.addTradingWallet(walletAddress, label);

    res.json({
      message: 'Trading wallet added successfully',
      wallet: user.tradingWallets[user.tradingWallets.length - 1]
    });
  } catch (error) {
    logger.error('Error adding wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// 设置默认跟单钱包
router.put('/default', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    const user = await User.findById(req.user._id);
    await user.setDefaultTradingWallet(walletAddress);

    res.json({
      message: 'Default wallet set successfully'
    });
  } catch (error) {
    logger.error('Error setting default wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除交易钱包
router.delete('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const user = await User.findById(req.user._id);
    user.tradingWallets = user.tradingWallets.filter(
      w => w.walletAddress !== walletAddress
    );
    await user.save();

    res.json({ message: 'Wallet removed successfully' });
  } catch (error) {
    logger.error('Error removing wallet:', error);
    res.status(500).json({ error: 'Failed to remove wallet' });
  }
});

// 查询钱包余额
router.get('/:walletAddress/balance', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const balance = await web3Service.getBalance(walletAddress);

    res.json({ balance });
  } catch (error) {
    logger.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

export default router;
```

**4. 修改跟单创建逻辑**

```javascript
// 在 routes/copy.js 中修改创建跟单配置
router.post('/', async (req, res) => {
  try {
    const {
      followerId,
      traderId,
      tradingWalletAddress,  // ✅ 新增参数
      copyRatio,
      // ... 其他参数
    } = req.body;

    // 验证钱包地址是否属于用户
    const follower = await User.findById(followerId);
    const isUserWallet = follower.tradingWallets.some(
      w => w.walletAddress === tradingWalletAddress
    ) || follower.walletAddress === tradingWalletAddress;

    if (!isUserWallet) {
      return res.status(400).json({
        error: 'Trading wallet address not associated with user'
      });
    }

    const copyConfig = new CopyConfig({
      follower: followerId,
      trader: traderId,
      tradingWalletAddress,  // ✅ 使用指定的钱包
      copyRatio,
      // ... 其他参数
    });

    await copyConfig.save();
    res.json({ message: 'Copy configuration created', config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**5. 前端钱包管理页面**

创建 `client/src/pages/Wallets.jsx`:
```jsx
import React, { useEffect, useState } from 'react';

function Wallets({ user }) {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWallet, setNewWallet] = useState('');
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    loadWallets();
  }, [user]);

  const loadWallets = async () => {
    // 加载钱包列表
  };

  const addWallet = async () => {
    // 添加新钱包
  };

  return (
    <div className="container">
      <h2>交易钱包管理</h2>

      <div className="card">
        <h3>添加新钱包</h3>
        <input
          placeholder="钱包地址"
          value={newWallet}
          onChange={(e) => setNewWallet(e.target.value)}
        />
        <input
          placeholder="钱包标签"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <button className="btn btn-primary" onClick={addWallet}>
          添加钱包
        </button>
      </div>

      <div className="card">
        <h3>我的钱包列表</h3>
        {wallets.map(wallet => (
          <div key={wallet.walletAddress} className="wallet-item">
            <div>
              <strong>{wallet.label}</strong>
              <span>{wallet.walletAddress}</span>
              {wallet.isDefault && <span className="badge badge-success">默认</span>}
            </div>
            <div>余额: {wallet.balance} ETH</div>
            {!wallet.isDefault && (
              <button onClick={() => setDefaultWallet(wallet.walletAddress)}>
                设为默认
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Wallets;
```

## 五、安全最佳实践总结

### ✅ 推荐做法

1. **使用客户端签名**
   - 私钥永不离开用户设备
   - 使用 MetaMask 等钱包管理

2. **硬件钱包**
   - 使用 Ledger, Trezor 等硬件设备
   - 物理隔离,安全性最高

3. **密钥管理系统**
   - AWS KMS, Hashicorp Vault
   - 专业的密钥管理服务

4. **定期安全审计**
   - 检查日志中的敏感信息
   - 审查代码漏洞
   - 渗透测试

5. **最小权限原则**
   - 只给予必要的权限
   - 定期轮换密钥
   - 使用多重签名

### ❌ 禁止做法

1. **明文存储私钥**
   - 不在环境变量存储
   - 不在代码中硬编码
   - 不在日志中输出

2. **不加密传输**
   - 必须使用 HTTPS
   - 加密敏感数据

3. **共享私钥**
   - 每个账户独立私钥
   - 不在团队间共享

4. **使用测试密钥**
   - 生产环境使用强密钥
   - 不使用默认密钥

## 六、实施建议

### 立即实施(高优先级)
1. ✅ 修改为客户端签名方案
2. ✅ 删除服务器端私钥存储
3. ✅ 更新文档说明安全机制

### 近期实施(中优先级)
1. ✅ 实现自定义跟单钱包地址
2. ✅ 添加钱包管理功能
3. ✅ 实现硬件钱包支持

### 长期规划(低优先级)
1. ✅ 集成专业密钥管理系统
2. ✅ 实现多重签名
3. ✅ 添加安全审计日志

---

**文档版本**: v1.0
**最后更新**: 2026年3月23日
**重要**: 当前代码存在安全漏洞,请立即整改!

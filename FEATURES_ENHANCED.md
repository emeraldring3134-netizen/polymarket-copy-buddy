# 增强功能详细文档

## 目录
1. [私钥加密存储](#1-私钥加密存储)
2. [自定义跟单钱包](#2-自定义跟单钱包)
3. [市场过滤系统](#3-市场过滤系统)
4. [API 接口说明](#4-api-接口说明)
5. [使用指南](#5-使用指南)

---

## 1. 私钥加密存储

### 功能概述
私钥加密存储系统使用 AES-256-GCM 算法对私钥进行加密，启动时需要输入解密密码才能使用私钥。解密后的私钥仅存储在内存中，禁止交换到磁盘。

### 技术细节

#### 加密算法
- **算法**: AES-256-GCM (Galois/Counter Mode)
- **密钥长度**: 256 位
- **密钥派生**: PBKDF2 (100,000 次迭代)
- **哈希算法**: SHA-256

#### 安全特性
✅ **私钥加密存储**
- 使用用户密码加密私钥
- 存储在数据库中（`encryptedPrivateKey` 字段）
- 默认查询时自动排除（`select: false`）

✅ **内存保护**
- 解密后的私钥仅存储在内存中
- 使用 `MemoryProtectionService` 保护敏感数据
- 进程退出时自动清理内存

✅ **密码强度检测**
- 最少 12 个字符
- 必须包含大小写字母、数字、特殊字符
- 实时密码强度评分（0-100）

✅ **防止内存交换**
- Linux/macOS: 使用 `mlock()` 系统调用
- JavaScript 层面的数据覆盖保护

### 使用流程

#### 首次设置
1. 访问"加密设置"页面
2. 输入私钥和强密码
3. 系统自动加密并存储
4. 重新登录时需要输入密码解密

#### 每次启动
1. 系统检测到加密密钥已设置
2. 提示输入解密密码
3. 验证密码后解密私钥到内存
4. 私钥可用于交易签名

#### 锁定/解锁
- **锁定**: 清除内存中的私钥，需要重新输入密码
- **解锁**: 输入密码重新解密私钥

#### 修改密码
1. 输入当前密码
2. 设置新密码（需通过强度检测）
3. 系统重新加密私钥
4. 旧密钥失效

### API 端点

#### POST `/api/encryption/setup`
首次设置加密
```json
{
  "privateKey": "0x...",
  "password": "StrongP@ssw0rd123!"
}
```

#### POST `/api/encryption/decrypt`
解密私钥
```json
{
  "password": "StrongP@ssw0rd123!"
}
```

#### POST `/api/encryption/change-password`
修改密码
```json
{
  "oldPassword": "OldP@ssw0rd",
  "newPassword": "NewP@ssw0rd123!"
}
```

#### POST `/api/encryption/lock`
锁定加密（清除内存）

#### GET `/api/encryption/status`
获取加密状态
```json
{
  "isSetup": true,
  "isDecrypted": true,
  "algorithm": "aes-256-gcm",
  "keyLength": 256,
  "memoryProtected": true
}
```

#### POST `/api/encryption/test-password`
测试密码强度
```json
{
  "password": "test123"
}
```
返回：
```json
{
  "strength": {
    "score": 25,
    "warnings": [
      "Password should be at least 12 characters long",
      "Password should contain uppercase letters",
      "Password should contain special characters"
    ]
  }
}
```

---

## 2. 自定义跟单钱包

### 功能概述
用户可以添加多个交易钱包，每个跟单配置可以指定使用不同的钱包进行交易。

### 数据结构

#### User 模型扩展
```javascript
{
  "tradingWallets": [
    {
      "address": "0x1234...",
      "label": "主交易钱包",
      "isDefault": true,
      "minHoldings": 100,
      "createdAt": "2026-03-23T00:00:00.000Z",
      "lastUsed": "2026-03-23T12:30:00.000Z"
    }
  ]
}
```

#### CopyConfig 模型扩展
```javascript
{
  "tradingWalletAddress": "0x1234...", // 指定使用哪个钱包
  // ... 其他配置
}
```

### 功能特性

#### 钱包管理
- ✅ 添加新钱包（地址、标签、最小持仓）
- ✅ 删除钱包
- ✅ 设置默认钱包
- ✅ 编辑钱包信息
- ✅ 实时查询余额
- ✅ 查看使用历史

#### 跟单配置
- ✅ 每个跟单配置可指定交易钱包
- ✅ 默认使用用户的默认钱包
- ✅ 可根据钱包余额动态选择

#### 风险控制
- ✅ 钱包最小持仓要求
- ✅ 自动跳过余额不足的钱包
- ✅ 跟单前检查钱包余额

### API 端点

#### GET `/api/wallets`
获取所有钱包
```json
{
  "success": true,
  "wallets": [
    {
      "address": "0x1234...",
      "label": "主交易钱包",
      "isDefault": true,
      "minHoldings": 100,
      "balance": 250.5,
      "lastUsed": "2026-03-23T12:30:00.000Z"
    }
  ]
}
```

#### POST `/api/wallets`
添加钱包
```json
{
  "address": "0x5678...",
  "label": "备用钱包",
  "minHoldings": 50
}
```

#### DELETE `/api/wallets/:address`
删除钱包

#### PUT `/api/wallets/:address/default`
设置默认钱包

#### PUT `/api/wallets/:address`
更新钱包信息
```json
{
  "label": "新标签",
  "minHoldings": 200
}
```

#### GET `/api/wallets/:address/balance`
查询钱包余额

---

## 3. 市场过滤系统

### 功能概述
增强的市场过滤系统提供 4 种高级过滤器，帮助用户精确控制跟单行为。

### 过滤器类型

### 3.1 价格漂移过滤器 (Price Drift Filter)

#### 功能说明
限制交易员入场价格与当前市场价格的差异百分比，防止在高价跟单。

#### 配置参数
```javascript
{
  "priceDriftFilter": {
    "enabled": true,
    "maxDriftPercentage": 5 // 最大允许 5% 的价格漂移
  }
}
```

#### 工作原理
1. 获取交易员的入场价格 `traderPrice`
2. 获取当前市场价格 `currentPrice`
3. 计算漂移百分比：
   ```javascript
   drift = |traderPrice - currentPrice| / traderPrice * 100
   ```
4. 如果 `drift > maxDriftPercentage`，跳过此交易

#### 使用场景
- ✅ 避免在价格快速波动时跟单
- ✅ 防止跟单已经上涨的市场
- ✅ 控制跟单时机

---

### 3.2 市场到期时间过滤器 (Market Expiry Filter)

#### 功能说明
限制跟单市场的到期时间范围。

#### 配置参数
```javascript
{
  "marketExpiryFilter": {
    "enabled": true,
    "minHoursToExpiry": 1,    // 最少 1 小时后到期
    "maxHoursToExpiry": null   // 无最大限制
  }
}
```

#### 工作原理
1. 获取市场的到期时间 `expiryDate`
2. 计算距离到期的剩余时间 `hoursToExpiry`
3. 检查是否在允许范围内：
   ```javascript
   minHoursToExpiry <= hoursToExpiry <= maxHoursToExpiry
   ```

#### 使用场景
- ✅ 避免跟单即将到期的市场（风险高）
- ✅ 仅跟单长期市场（更稳定）
- ✅ 避免超长期市场（流动性低）

---

### 3.3 市场价格区间过滤器 (Market Price Range Filter)

#### 功能说明
限制跟单市场的当前价格范围。

#### 配置参数
```javascript
{
  "marketPriceRangeFilter": {
    "enabled": true,
    "minPrice": 0.01,      // 最小价格 0.01 USDC
    "maxPrice": null        // 无最大限制
  }
}
```

#### 工作原理
1. 获取市场当前价格 `currentPrice`
2. 检查是否在允许范围内：
   ```javascript
   minPrice <= currentPrice <= maxPrice
   ```

#### 使用场景
- ✅ 避免跟单过小的市场（手续费占比高）
- ✅ 避免跟单过大的市场（单笔风险高）
- ✅ 根据资金规模调整策略

---

### 3.4 钱包持仓过滤器 (Wallet Holdings Filter)

#### 功能说明
要求目标钱包的最小持仓金额。

#### 配置参数
```javascript
{
  "walletHoldingsFilter": {
    "enabled": true,
    "minHoldingsAmount": 100  // 钱包至少有 100 USDC
  }
}
```

#### 工作原理
1. 获取钱包实时余额 `walletBalance`
2. 检查是否满足最小要求：
   ```javascript
   walletBalance >= minHoldingsAmount
   ```

#### 使用场景
- ✅ 确保有足够资金跟单
- ✅ 避免余额不足导致的失败
- ✅ 风险控制

---

### 完整配置示例

```javascript
{
  "trader": "trader_id",
  "follower": "user_id",
  "tradingWalletAddress": "0x1234...",
  "copyRatio": 0.5,
  
  // 基础限制
  "minTradeAmount": 1,
  "maxTradeAmount": 1000,
  "maxDailyTrades": 10,
  "maxDailyAmount": 1000,
  
  // 高级过滤器
  "priceDriftFilter": {
    "enabled": true,
    "maxDriftPercentage": 5
  },
  
  "marketExpiryFilter": {
    "enabled": true,
    "minHoursToExpiry": 2,
    "maxHoursToExpiry": 168  // 7 天
  },
  
  "marketPriceRangeFilter": {
    "enabled": true,
    "minPrice": 0.05,
    "maxPrice": 10
  },
  
  "walletHoldingsFilter": {
    "enabled": true,
    "minHoldingsAmount": 200
  },
  
  // 分类过滤
  "excludedCategories": ["politics"],
  "onlyInCategories": ["crypto", "sports"],
  
  // 盈利过滤
  "onlyProfitableMarkets": false,
  
  "enabled": true
}
```

---

## 4. API 接口说明

### 加密管理 API

#### 创建加密配置
```
POST /api/encryption/setup
Content-Type: application/json
Authorization: Bearer <token>

{
  "privateKey": "0x...",
  "password": "StrongP@ssw0rd123!"
}

Response:
{
  "success": true,
  "message": "Encryption setup completed successfully",
  "walletAddress": "0x...",
  "algorithm": "aes-256-gcm",
  "keyLength": 256
}
```

#### 解密私钥
```
POST /api/encryption/decrypt
Authorization: Bearer <token>

{
  "password": "StrongP@ssw0rd123!"
}

Response:
{
  "success": true,
  "message": "Decryption completed successfully",
  "walletAddress": "0x..."
}
```

---

### 钱包管理 API

#### 获取钱包列表
```
GET /api/wallets
Authorization: Bearer <token>

Response:
{
  "success": true,
  "wallets": [...]
}
```

#### 添加钱包
```
POST /api/wallets
Authorization: Bearer <token>

{
  "address": "0x...",
  "label": "我的钱包",
  "minHoldings": 100
}

Response (201):
{
  "success": true,
  "message": "Trading wallet added successfully",
  "wallet": {...}
}
```

---

### 跟单配置 API (扩展)

#### 创建跟单配置（支持新参数）
```
POST /api/copy
Authorization: Bearer <token>

{
  "trader": "trader_id",
  "tradingWalletAddress": "0x...",
  "copyRatio": 0.5,
  "priceDriftFilter": {
    "enabled": true,
    "maxDriftPercentage": 5
  },
  "marketExpiryFilter": {
    "enabled": true,
    "minHoursToExpiry": 1,
    "maxHoursToExpiry": null
  },
  "marketPriceRangeFilter": {
    "enabled": true,
    "minPrice": 0.01,
    "maxPrice": null
  },
  "walletHoldingsFilter": {
    "enabled": true,
    "minHoldingsAmount": 100
  }
}
```

#### 跳过统计
```javascript
{
  "stats": {
    "skippedTrades": 15,
    "skipReasons": [
      {
        "reason": "Price drift 6.5% exceeds limit 5%",
        "count": 8,
        "lastSkipped": "2026-03-23T12:30:00.000Z"
      },
      {
        "reason": "Market expires in 0.5h, below minimum 1h",
        "count": 5,
        "lastSkipped": "2026-03-23T11:45:00.000Z"
      },
      {
        "reason": "Wallet balance 50 below minimum 100",
        "count": 2,
        "lastSkipped": "2026-03-23T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 5. 使用指南

### 5.1 首次使用流程

#### 步骤 1: 设置加密
1. 访问"加密设置"页面
2. 输入您的私钥（格式：`0x...`）
3. 创建强密码（至少 12 位，包含大小写、数字、特殊字符）
4. 点击"设置加密"

#### 步骤 2: 添加钱包
1. 访问"钱包管理"页面
2. 点击"添加钱包"
3. 输入钱包地址
4. 设置标签（如"主钱包"、"备用钱包"）
5. 设置最小持仓要求
6. 设置为默认钱包

#### 步骤 3: 配置跟单
1. 在"交易员"页面选择要跟单的交易员
2. 在"我的跟单"页面编辑配置
3. 选择交易钱包
4. 设置跟单比例
5. 配置高级过滤器
6. 保存配置

#### 步骤 4: 解密并启动
1. 每次启动应用时，访问"加密设置"
2. 输入密码解密私钥
3. 系统自动开始跟单监控

---

### 5.2 最佳实践

#### 密码安全
- ✅ 使用至少 12 位密码
- ✅ 包含大小写字母、数字、特殊字符
- ✅ 不要使用常见密码
- ✅ 定期更换密码
- ✅ 不要忘记密码（无法找回！）

#### 钱包管理
- ✅ 使用多个钱包分散风险
- ✅ 为不同策略设置不同钱包
- ✅ 设置合理的最小持仓
- ✅ 定期检查余额
- ✅ 及时更新钱包信息

#### 过滤器配置
- ✅ 价格漂移：建议 3-5%
- ✅ 到期时间：建议至少 2 小时
- ✅ 价格区间：根据资金规模调整
- ✅ 持仓要求：根据单笔交易金额设置
- ✅ 定期查看跳过统计，优化配置

#### 风险控制
- ✅ 设置合理的跟单比例（0.3-0.7）
- ✅ 设置每日交易限额
- ✅ 使用止损/止盈
- ✅ 定期检查跟单历史
- ✅ 及时暂停表现不佳的跟单

---

### 5.3 常见问题

#### Q: 忘记密码怎么办？
A: **无法找回！** 密码是解密私钥的唯一途径。如果忘记密码，需要：
1. 删除用户账户
2. 重新设置加密
3. 使用新的私钥和密码

#### Q: 可以存储明文私钥吗？
A: **不推荐！** 明文私钥存在严重安全风险。强烈建议使用加密功能。

#### Q: 内存中的私钥会被写入磁盘吗？
A: 系统会尽力防止，但无法 100% 保证。建议：
- 使用 Linux/macOS 服务器（支持 mlock）
- 避免使用休眠/睡眠模式
- 定期重启应用

#### Q: 如何更换跟单钱包？
A: 两种方式：
1. 编辑跟单配置，选择新钱包
2. 修改默认钱包（使用默认配置的跟单会自动使用新钱包）

#### Q: 过滤器设置过严会导致没有跟单吗？
A: 是的。如果所有过滤器都很严格，可能会跳过所有交易。建议：
- 从宽松的设置开始
- 查看跳过统计
- 根据实际情况调整

---

### 5.4 故障排查

#### 问题: 解密失败
**可能原因**:
- 密码错误
- 加密数据损坏
- 数据库问题

**解决方法**:
1. 检查密码是否正确
2. 查看服务器日志
3. 联系技术支持

#### 问题: 钱包余额显示 0
**可能原因**:
- RPC 节点问题
- 网络问题
- 钱包确实为空

**解决方法**:
1. 点击"刷新"按钮
2. 检查 RPC 节点配置
3. 在区块链浏览器查询

#### 问题: 跟单不执行
**可能原因**:
- 加密未解密
- 钱包余额不足
- 过滤器设置过严
- 跟单配置未启用

**解决方法**:
1. 检查加密状态
2. 查看钱包余额
3. 检查跳过统计
4. 确认跟单已启用

---

## 6. 安全建议

### 6.1 密码安全
- ✅ 使用密码管理器
- ✅ 不要重复使用密码
- ✅ 不要分享密码
- ✅ 定期更换密码

### 6.2 私钥安全
- ✅ 永远不要在聊天软件中发送私钥
- ✅ 不要在公共场所输入私钥
- ✅ 备份私钥到安全位置（加密存储）
- ✅ 考虑使用硬件钱包

### 6.3 服务器安全
- ✅ 使用防火墙
- ✅ 定期更新系统
- ✅ 使用 HTTPS
- ✅ 限制数据库访问
- ✅ 启用日志监控

### 6.4 应用安全
- ✅ 不要在代码中硬编码密钥
- ✅ 使用环境变量
- ✅ 定期备份
- ✅ 监控异常活动

---

## 7. 技术支持

如遇到问题，请提供以下信息：
- 错误消息
- 操作步骤
- 配置详情（隐去敏感信息）
- 服务器日志
- 浏览器控制台日志（前端问题）

---

**文档版本**: v2.0  
**最后更新**: 2026-03-23  
**适用版本**: Polymarket Copy Trading v2.0+

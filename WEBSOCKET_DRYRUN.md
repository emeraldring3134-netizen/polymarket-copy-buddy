# WebSocket 和 Dry Run 功能文档

## 目录
1. [WebSocket 实时监控](#1-websocket-实时监控)
2. [Dry Run 模拟运行](#2-dry-run-模拟运行)
3. [API 接口说明](#3-api-接口说明)
4. [使用指南](#4-使用指南)
5. [最佳实践](#5-最佳实践)

---

## 1. WebSocket 实时监控

### 功能概述
WebSocket 实时监控系统通过主动推送目标钱包的持仓变动，而不是定期扫描，从而实现更快速、更准确的跟单。

### 架构说明

#### 监控模式对比

| 特性 | Polling（轮询） | WebSocket（实时推送） |
|------|----------------|---------------------|
| 响应速度 | 30秒延迟 | 实时（< 1秒） |
| 资源消耗 | 中等 | 低 |
| 实现复杂度 | 简单 | 中等 |
| 可靠性 | 高 | 高（带重连） |
| 适用场景 | 低频交易 | 高频/实时交易 |

#### 工作流程

```
┌─────────────┐
│   Trader   │ 目标交易员钱包
│   Wallet    │
└──────┬──────┘
       │ 发起交易
       ▼
┌─────────────────────────────────┐
│  Polygon Network             │
│  (区块链）                  │
└──────┬──────────────────────┘
       │ 交易事件
       ▼
┌─────────────────────────────────┐
│  WebSocket Listener          │ ← 实时监听
│  - 订阅钱包交易          │
│  - 解码交易数据            │
│  - 推送给跟单系统          │
└──────┬──────────────────────┘
       │ 推送事件
       ▼
┌─────────────────────────────────┐
│  Copy Trading System        │
│  - 应用过滤器              │
│  - 计算跟单金额          │
│  - 执行/模拟跟单          │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  WebSocket Notification      │
│  - 推送给前端            │
│  - 更新状态              │
└─────────────────────────────┘
```

### 实现细节

#### 订阅管理
```javascript
// 订阅钱包
await websocketListener.subscribeToWallet(
  '0x1234...',
  (event) => {
    console.log('Trade detected:', event);
    // 处理交易事件
  }
);

// 取消订阅
await websocketListener.unsubscribeFromWallet('0x1234...');
```

#### 事件类型
1. **trade** - 新交易
   ```json
   {
     "type": "trade",
     "walletAddress": "0x...",
     "transactionHash": "0x...",
     "blockNumber": 12345678,
     "timestamp": 1679616000000,
     "trade": {
       "type": "trade",
       "amount": 100,
       "timestamp": 1679616000000,
       "rawData": { ... }
     }
   }
   ```

2. **block** - 新区块（可选）
   ```json
   {
     "type": "block",
     "blockNumber": 12345678,
     "timestamp": 1679616000000
   }
   ```

### 配置参数

#### CopyConfig 监控模式
```javascript
{
  "monitoringMode": "websocket", // 或 "polling"
  "enabled": true
}
```

#### 环境变量
```bash
# WebSocket RPC URL (自动转换 HTTP -> WS)
POLYGON_RPC_URL=https://polygon-rpc.com
# 实际连接: wss://polygon-rpc.com
```

### 自动重连机制
- **最大重连次数**: 10 次
- **重连延迟**: 5 秒
- **错误处理**: 自动记录错误日志
- **状态通知**: 通过 WebSocket 推送连接状态

---

## 2. Dry Run 模拟运行

### 功能概述
Dry Run（模拟运行）模式允许用户在实际执行交易前，使用历史数据模拟跟单策略的效果，评估 ROI、胜率等关键指标。

### 模拟类型

#### 2.1 历史数据模拟
使用过去 N 天的历史交易数据进行回测。

**特点**：
- ✅ 基于真实历史数据
- ✅ 快速获得结果
- ✅ 可调整时间段
- ✅ 支持详细分析

**适用场景**：
- 测试新策略
- 评估交易员表现
- 比较多个配置
- 优化过滤参数

#### 2.2 实时模拟
在实时模式下模拟交易，不实际执行。

**特点**：
- ✅ 实时监控交易
- ✅ 基于历史胜率模拟结果
- ✅ 持续更新统计
- ✅ 即时反馈

**适用场景**：
- 测试实时跟单
- 验证过滤器效果
- 评估实时表现

### Dry Run 配置

#### 基本配置
```javascript
{
  "dryRun": {
    "enabled": true,           // 是否启用 Dry Run
    "period": 7,              // 模拟周期（天）
    "initialBalance": 1000,    // 初始余额
    "startDate": null,         // 自定义开始日期
    "endDate": null            // 自定义结束日期
  }
}
```

#### 高级配置
```javascript
{
  "dryRun": {
    "enabled": true,
    "period": 30,                    // 模拟30天
    "initialBalance": 5000,            // 初始5000 USDC
    "startDate": "2026-01-01",       // 从1月1日开始
    "endDate": "2026-02-01"          // 到2月1日结束
  },
  "copyRatio": 0.5,
  "minTradeAmount": 10,
  "maxTradeAmount": 1000,
  // 所有过滤器同样适用
  "priceDriftFilter": { ... },
  "marketExpiryFilter": { ... }
}
```

### 模拟统计数据

#### 核心指标
```javascript
{
  "simulatedTrades": 150,        // 模拟交易次数
  "simulatedAmount": 15000,      // 模拟总金额
  "simulatedProfit": 3000,       // 模拟盈利
  "simulatedLoss": 2000,        // 模拟亏损
  "simulatedWinRate": 65.0,     // 模拟胜率
  "simulatedBalance": 7000,      // 最终余额
  "roi": 40.0,                 // 投资回报率
  "avgTradeSize": 100,          // 平均交易大小
  "profitFactor": 1.5           // 盈亏比
}
```

#### 交易明细
```javascript
[
  {
    "tradeId": "...",
    "timestamp": "2026-03-23T12:00:00.000Z",
    "marketTitle": "Bitcoin > $100k by 2026",
    "outcomeName": "Yes",
    "amount": 100,
    "price": 0.5,
    "direction": "yes",
    "outcome": "won",
    "profit": 100,
    "loss": null,
    "balance": 1100,
    "skipped": false
  },
  {
    "tradeId": "...",
    "timestamp": "2026-03-23T12:30:00.000Z",
    "reason": "Price drift 6% exceeds limit 5%",
    "skipped": true
  }
]
```

---

## 3. API 接口说明

### WebSocket 监听 API

#### 订阅钱包
```
内部调用: websocketListener.subscribeToWallet(address, callback)
```

#### 获取 WebSocket 状态
```
GET /health
Response: {
  "websocket": {
    "connected": true,
    "reconnectAttempts": 0,
    "subscribedWallets": ["0x..."],
    "subscriptionCount": 5
  }
}
```

### Dry Run API

#### POST `/api/dryrun/start`
启动 Dry Run 模拟
```json
{
  "configId": "config_id"
}

Response:
{
  "success": true,
  "message": "Dry run simulation completed successfully",
  "results": {
    "configId": "...",
    "trader": "trader_name",
    "follower": "follower_name",
    "period": "7 days",
    "startDate": "2026-03-16T00:00:00.000Z",
    "endDate": "2026-03-23T00:00:00.000Z",
    "initialBalance": 1000,
    "finalBalance": 1400,
    "totalProfitLoss": 400,
    "roi": 40.0,
    "simulatedTrades": 50,
    "simulatedAmount": 5000,
    "simulatedProfit": 3000,
    "simulatedLoss": 2000,
    "winRate": 65.0,
    "avgTradeSize": 100,
    "profitFactor": 1.5,
    "tradeDetails": [...]
  }
}
```

#### POST `/api/dryrun/simulate`
模拟单笔交易（实时模式）
```json
{
  "configId": "config_id",
  "tradeData": {
    "amount": 100,
    "price": 0.5,
    "transactionHash": "0x..."
  }
}

Response:
{
  "success": true,
  "message": "Trade simulation completed",
  "result": {
    "configId": "...",
    "tradeId": "0x...",
    "amount": 50,
    "outcome": "won",
    "profit": 50,
    "loss": null,
    "balance": 1050,
    "timestamp": "2026-03-23T12:00:00.000Z"
  }
}
```

#### GET `/api/dryrun/results/:configId`
获取 Dry Run 结果
```json
{
  "success": true,
  "results": {
    "simulatedTrades": 150,
    "simulatedAmount": 15000,
    "simulatedProfit": 3000,
    "simulatedLoss": 2000,
    "simulatedWinRate": 65.0,
    "simulatedBalance": 7000,
    "roi": 40.0,
    "avgTradeSize": 100,
    "profitFactor": 1.5,
    "lastSimulationDate": "2026-03-23T12:00:00.000Z"
  }
}
```

#### POST `/api/dryrun/reset/:configId`
重置 Dry Run 统计
```
Response:
{
  "success": true,
  "message": "Dry run statistics reset successfully"
}
```

#### POST `/api/dryrun/compare`
比较多个 Dry Run 结果
```json
{
  "configIds": ["config_1", "config_2", "config_3"]
}

Response:
{
  "success": true,
  "message": "Comparison completed successfully",
  "results": [
    {
      "configId": "config_1",
      "trader": "trader_a",
      "copyRatio": 0.5,
      "roi": 40.0,
      "simulatedTrades": 150,
      "winRate": 65.0,
      ...
    },
    ...
  ]
}
```

---

## 4. 使用指南

### WebSocket 实时监控

#### 步骤 1: 选择监控模式
在跟单配置中选择监控模式：
```javascript
{
  "monitoringMode": "websocket" // 推荐：实时推送
  // 或
  "monitoringMode": "polling"  // 轮询模式
}
```

#### 步骤 2: 启动系统
系统启动后会自动：
1. 连接到 WebSocket RPC
2. 订阅所有交易员钱包
3. 开始实时监听

#### 步骤 3: 监控状态
查看 `/health` 端点检查连接状态。

### Dry Run 模拟运行

#### 历史数据模拟

**步骤 1: 启用 Dry Run**
```javascript
{
  "dryRun": {
    "enabled": true,
    "period": 7,              // 模拟7天
    "initialBalance": 1000     // 初始1000 USDC
  }
}
```

**步骤 2: 运行模拟**
```javascript
const results = await dryRunApi.startDryRun(configId);
```

**步骤 3: 查看结果**
- 总交易次数
- 胜率
- 盈亏金额
- ROI
- 详细交易记录

**步骤 4: 分析优化**
- 查看被跳过的交易及原因
- 调整过滤器参数
- 重新运行模拟

#### 实时模拟

**步骤 1: 启用实时 Dry Run**
```javascript
{
  "dryRun": {
    "enabled": true,
    "initialBalance": 1000
  },
  "monitoringMode": "websocket"
}
```

**步骤 2: 监控模拟**
系统会实时：
1. 接收交易员交易
2. 应用过滤器
3. 模拟交易结果
4. 更新统计数据

**步骤 3: 查看实时统计**
通过 WebSocket 接收实时更新。

### 切换到真实交易

**确认配置后**：
1. 禁用 Dry Run
2. 解密私钥
3. 开始真实跟单

---

## 5. 最佳实践

### WebSocket 监控

#### ✅ 推荐做法
1. **优先使用 WebSocket**
   - 响应更快
   - 资源消耗更低
   - 实时性更好

2. **监控连接状态**
   ```javascript
   setInterval(async () => {
     const status = websocketListener.getStatus();
     if (!status.connected) {
       console.warn('WebSocket disconnected!');
     }
   }, 60000);
   ```

3. **处理断线重连**
   - 系统会自动重连
   - 监控重连次数
   - 及时处理持续失败

#### ⚠️ 注意事项
- 网络不稳定时考虑降级到轮询
- WebSocket 端点可能受网络限制
- 防火墙可能阻止 WebSocket 连接

### Dry Run 模拟

#### ✅ 推荐做法

1. **先做 Dry Run，再做真实交易**
   ```javascript
   // 1. 运行 7 天 Dry Run
   await dryRunApi.startDryRun(configId);
   
   // 2. 分析结果
   // 3. 优化配置
   // 4. 再次 Dry Run
   // 5. 确认后再真实交易
   ```

2. **模拟足够长的周期**
   - 至少 7 天
   - 推荐 30 天
   - 覆盖不同市场条件

3. **测试多种配置**
   ```javascript
   const results = await dryRunApi.compareDryRuns([
     config1Id, config2Id, config3Id
   ]);
   
   // 选择 ROI 最高的配置
   ```

4. **分析跳过原因**
   - 查看哪些交易被跳过
   - 优化过滤器设置
   - 平衡严格度和机会数量

5. **关注关键指标**
   - **ROI** (> 20% 良好)
   - **胜率** (> 55% 良好)
   - **盈亏比** (> 1.2 良好)
   - **交易次数** (> 50 可靠)

#### ⚠️ 注意事项

1. **历史 ≠ 未来**
   - 过去表现不代表未来
   - 市场条件可能变化
   - 交易员策略可能改变

2. **模拟的局限性**
   - 使用历史胜率模拟
   - 不考虑滑点影响
   - 不考虑市场流动性变化

3. **小样本不可靠**
   - 交易次数 < 50：统计不可靠
   - 交易次数 < 20：仅作参考

4. **定期重新测试**
   - 每月运行一次 Dry Run
   - 比较最新和历史结果
   - 及时调整策略

---

## 6. 故障排查

### WebSocket 问题

#### 问题: WebSocket 连接失败
**可能原因**:
- RPC 端点不支持 WebSocket
- 网络防火墙阻止
- 端点地址错误

**解决方法**:
1. 检查 `POLYGON_RPC_URL` 配置
2. 使用公共 WebSocket RPC：
   ```bash
   POLYGON_RPC_URL=wss://polygon-rpc.com
   ```
3. 检查防火墙设置
4. 降级到轮询模式

#### 问题: 频繁断线重连
**可能原因**:
- 网络不稳定
- RPC 端点问题
- 服务器负载过高

**解决方法**:
1. 检查网络连接
2. 切换到其他 RPC 端点
3. 增加重连延迟

### Dry Run 问题

#### 问题: 模拟结果为空
**可能原因**:
- 时间段内无交易数据
- 过滤器设置过严
- 交易员为新用户

**解决方法**:
1. 延长模拟周期
2. 放宽过滤器
3. 检查交易员交易记录

#### 问题: 模拟结果异常（ROI 极高/极低）
**可能原因**:
- 交易数据错误
- 过滤器 bug
- 计算逻辑错误

**解决方法**:
1. 检查交易明细
2. 手动验证关键交易
3. 联系技术支持

---

## 7. 性能优化

### WebSocket 监听

#### 订阅优化
```javascript
// 仅订阅活跃的配置
const activeConfigs = configs.filter(c => c.enabled && c.monitoringMode === 'websocket');
const uniqueWallets = [...new Set(activeConfigs.map(c => c.trader.walletAddress))];

// 订阅唯一钱包
for (const wallet of uniqueWallets) {
  await websocketListener.subscribeToWallet(wallet, callback);
}
```

#### 内存优化
- 限制保留的交易历史
- 定期清理过期数据
- 使用分页查询

### Dry Run 模拟

#### 查询优化
```javascript
// 使用索引
tradeSchema.index({ trader: 1, createdAt: -1 });

// 分批查询
const batchSize = 1000;
for (let i = 0; i < totalTrades; i += batchSize) {
  const trades = await Trade.find(...)
    .skip(i)
    .limit(batchSize);
  // 处理批次
}
```

#### 并行处理
```javascript
// 并行处理多个配置
const results = await Promise.all(
  configIds.map(id => dryRunService.runDryRun(id))
);
```

---

**文档版本**: v1.0  
**最后更新**: 2026-03-23  
**适用版本**: Polymarket Copy Trading v2.1+

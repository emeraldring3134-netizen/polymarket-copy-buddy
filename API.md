# API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON

## 认证

### 钱包登录/注册

**请求**:
```http
POST /auth/wallet
Content-Type: application/json

{
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "username": "trader1",
  "email": "user@example.com"
}
```

**响应**:
```json
{
  "message": "Success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60f1b2c3d4e5f6789abc1234",
    "username": "trader1",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "email": "user@example.com",
    "isTrader": false,
    "totalTrades": 0,
    "winRate": 0,
    "profitLoss": 0
  }
}
```

### 验证 Token

**请求**:
```http
GET /auth/verify
Authorization: Bearer <token>
```

**响应**:
```json
{
  "user": {
    "id": "60f1b2c3d4e5f6789abc1234",
    "username": "trader1",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "email": "user@example.com",
    "isTrader": false,
    "totalTrades": 0,
    "winRate": 0,
    "profitLoss": 0
  }
}
```

## 市场

### 获取市场列表

**请求**:
```http
GET /markets?category=politics&status=open&page=1&limit=50&search=election
```

**查询参数**:
- `category` (string): 市场分类
- `status` (string): 状态 (open, closed, resolved)
- `page` (number): 页码
- `limit` (number): 每页数量
- `search` (string): 搜索关键词

**响应**:
```json
{
  "markets": [
    {
      "_id": "60f1b2c3d4e5f6789abc5678",
      "polymarketId": "market-12345",
      "title": "Will X win the election?",
      "description": "Market description",
      "question": "Will X win the 2024 election?",
      "category": "politics",
      "outcomes": [
        {
          "id": "yes",
          "name": "Yes",
          "price": 0.65
        },
        {
          "id": "no",
          "name": "No",
          "price": 0.35
        }
      ],
      "endDate": "2024-12-31T23:59:59.000Z",
      "status": "open",
      "totalVolume": 1500000,
      "liquidity": 500000,
      "imageUrl": "https://example.com/image.png",
      "slug": "will-x-win-election",
      "tags": ["politics", "election"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### 获取单个市场

**请求**:
```http
GET /markets/:id
```

**响应**:
```json
{
  "market": {
    "_id": "60f1b2c3d4e5f6789abc5678",
    "polymarketId": "market-12345",
    "title": "Will X win the election?",
    "description": "Market description",
    "question": "Will X win the 2024 election?",
    "category": "politics",
    "outcomes": [
      {
        "id": "yes",
        "name": "Yes",
        "price": 0.65
      }
    ],
    "endDate": "2024-12-31T23:59:59.000Z",
    "status": "open",
    "totalVolume": 1500000,
    "liquidity": 500000,
    "imageUrl": "https://example.com/image.png",
    "slug": "will-x-win-election",
    "tags": ["politics", "election"]
  }
}
```

### 同步市场数据

**请求**:
```http
POST /markets/sync
Content-Type: application/json

{
  "limit": 100
}
```

**响应**:
```json
{
  "message": "Markets synced successfully",
  "syncedCount": 100,
  "totalMarkets": 100
}
```

### 获取市场分类

**请求**:
```http
GET /markets/categories/list
```

**响应**:
```json
{
  "categories": [
    {
      "_id": "politics",
      "count": 45
    },
    {
      "_id": "sports",
      "count": 32
    },
    {
      "_id": "crypto",
      "count": 28
    }
  ]
}
```

## 交易员

### 获取热门交易员

**请求**:
```http
GET /traders/top?limit=20&sortBy=profitLoss
```

**查询参数**:
- `limit` (number): 返回数量
- `sortBy` (string): 排序字段 (profitLoss, winRate, totalTrades, totalVolume)

**响应**:
```json
{
  "traders": [
    {
      "_id": "60f1b2c3d4e5f6789abc9999",
      "username": "toptrader",
      "walletAddress": "0x9876543210fedcba9876543210fedcba98765432",
      "totalTrades": 150,
      "winRate": 68.5,
      "profitLoss": 25000.5,
      "totalVolume": 500000,
      "avgTradeSize": 3333.33,
      "followersCount": 45,
      "followingCount": 0,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 获取交易员详情

**请求**:
```http
GET /traders/:id
```

**响应**:
```json
{
  "trader": {
    "id": "60f1b2c3d4e5f6789abc9999",
    "username": "toptrader",
    "walletAddress": "0x9876543210fedcba9876543210fedcba98765432",
    "totalTrades": 150,
    "winRate": 68.5,
    "profitLoss": 25000.5,
    "totalVolume": 500000,
    "avgTradeSize": 3333.33,
    "followersCount": 45,
    "followingCount": 0,
    "settings": {
      "allowCopying": true,
      "minFollowAmount": 10
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "recentTrades": [
    {
      "_id": "60f1b2c3d4e5f6789abc8888",
      "market": {
        "title": "Will X win the election?",
        "polymarketId": "market-12345"
      },
      "amount": 100,
      "price": 0.65,
      "direction": "yes",
      "status": "open",
      "createdAt": "2024-03-20T10:30:00.000Z"
    }
  ]
}
```

### 搜索交易员

**请求**:
```http
GET /traders/search/:query?limit=20
```

**响应**:
```json
{
  "traders": [
    {
      "_id": "60f1b2c3d4e5f6789abc9999",
      "username": "toptrader",
      "walletAddress": "0x9876543210fedcba9876543210fedcba98765432",
      "totalTrades": 150,
      "winRate": 68.5,
      "profitLoss": 25000.5
    }
  ]
}
```

### 更新交易员设置

**请求**:
```http
PUT /traders/:id/settings
Content-Type: application/json

{
  "allowCopying": true,
  "minFollowAmount": 10
}
```

**响应**:
```json
{
  "message": "Settings updated successfully",
  "settings": {
    "allowCopying": true,
    "minFollowAmount": 10
  }
}
```

## 跟单配置

### 创建跟单配置

**请求**:
```http
POST /copy
Content-Type: application/json

{
  "followerId": "60f1b2c3d4e5f6789abc1111",
  "traderId": "60f1b2c3d4e5f6789abc9999",
  "copyRatio": 0.5,
  "minTradeAmount": 1,
  "maxTradeAmount": 1000,
  "stopLossPercentage": 20,
  "takeProfitPercentage": 50,
  "maxDailyTrades": 10,
  "maxDailyAmount": 1000,
  "excludedCategories": ["politics"],
  "onlyInCategories": ["crypto", "sports"]
}
```

**响应**:
```json
{
  "message": "Copy configuration created successfully",
  "config": {
    "id": "60f1b2c3d4e5f6789abc7777",
    "trader": {
      "id": "60f1b2c3d4e5f6789abc9999",
      "username": "toptrader",
      "totalTrades": 150,
      "winRate": 68.5,
      "profitLoss": 25000.5
    },
    "copyRatio": 0.5,
    "minTradeAmount": 1,
    "maxTradeAmount": 1000,
    "enabled": true,
    "stats": {
      "totalCopiedTrades": 0,
      "totalCopiedAmount": 0,
      "totalProfit": 0,
      "totalLoss": 0,
      "lastCopyTime": null,
      "dailyTradeCount": 0,
      "dailyAmount": 0
    }
  }
}
```

### 获取用户跟单配置

**请求**:
```http
GET /copy/user/:userId
```

**响应**:
```json
{
  "configs": [
    {
      "_id": "60f1b2c3d4e5f6789abc7777",
      "follower": {
        "id": "60f1b2c3d4e5f6789abc1111",
        "username": "follower1"
      },
      "trader": {
        "id": "60f1b2c3d4e5f6789abc9999",
        "username": "toptrader",
        "totalTrades": 150,
        "winRate": 68.5,
        "profitLoss": 25000.5
      },
      "copyRatio": 0.5,
      "minTradeAmount": 1,
      "maxTradeAmount": 1000,
      "enabled": true,
      "stats": {
        "totalCopiedTrades": 25,
        "totalCopiedAmount": 5000,
        "totalProfit": 1500,
        "totalLoss": 500,
        "lastCopyTime": "2024-03-20T10:30:00.000Z",
        "dailyTradeCount": 3,
        "dailyAmount": 300
      }
    }
  ]
}
```

### 更新跟单配置

**请求**:
```http
PUT /copy/:id
Content-Type: application/json

{
  "enabled": false,
  "copyRatio": 0.8,
  "maxDailyTrades": 15
}
```

**响应**:
```json
{
  "message": "Copy configuration updated successfully",
  "config": {
    "_id": "60f1b2c3d4e5f6789abc7777",
    "copyRatio": 0.8,
    "enabled": false,
    "maxDailyTrades": 15
  }
}
```

### 删除跟单配置

**请求**:
```http
DELETE /copy/:id
```

**响应**:
```json
{
  "message": "Copy configuration deleted successfully"
}
```

### 获取跟单统计

**请求**:
```http
GET /copy/:id/stats
```

**响应**:
```json
{
  "stats": {
    "totalCopied": 25,
    "totalAmount": 5000,
    "winRate": 80,
    "totalProfit": 1500,
    "totalLoss": 500,
    "netProfit": 1000
  }
}
```

## 交易

### 创建交易

**请求**:
```http
POST /trades
Content-Type: application/json

{
  "traderId": "60f1b2c3d4e5f6789abc1111",
  "marketId": "60f1b2c3d4e5f6789abc5678",
  "outcomeId": "yes",
  "outcomeName": "Yes",
  "amount": 100,
  "price": 0.65,
  "direction": "yes",
  "polymarketId": "market-12345"
}
```

**响应**:
```json
{
  "message": "Trade created successfully",
  "trade": {
    "_id": "60f1b2c3d4e5f6789abc8888",
    "polymarketId": "market-12345",
    "trader": "60f1b2c3d4e5f6789abc1111",
    "market": "60f1b2c3d4e5f6789abc5678",
    "outcomeId": "yes",
    "outcomeName": "Yes",
    "amount": 100,
    "price": 0.65,
    "shares": 153.85,
    "direction": "yes",
    "status": "open",
    "profit": 0,
    "createdAt": "2024-03-20T10:30:00.000Z"
  }
}
```

### 获取交易列表

**请求**:
```http
GET /trades?traderId=...&marketId=...&status=open&page=1&limit=20
```

**查询参数**:
- `traderId` (string): 交易员 ID
- `marketId` (string): 市场 ID
- `status` (string): 交易状态
- `page` (number): 页码
- `limit` (number): 每页数量

**响应**:
```json
{
  "trades": [
    {
      "_id": "60f1b2c3d4e5f6789abc8888",
      "trader": {
        "username": "trader1",
        "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
      },
      "market": {
        "title": "Will X win the election?",
        "polymarketId": "market-12345"
      },
      "outcomeId": "yes",
      "outcomeName": "Yes",
      "amount": 100,
      "price": 0.65,
      "shares": 153.85,
      "direction": "yes",
      "status": "open",
      "profit": 0,
      "createdAt": "2024-03-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 获取单个交易

**请求**:
```http
GET /trades/:id
```

**响应**:
```json
{
  "trade": {
    "_id": "60f1b2c3d4e5f6789abc8888",
    "trader": {
      "username": "trader1",
      "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
    },
    "market": {
      "title": "Will X win the election?",
      "polymarketId": "market-12345"
    },
    "outcomeId": "yes",
    "outcomeName": "Yes",
    "amount": 100,
    "price": 0.65,
    "shares": 153.85,
    "direction": "yes",
    "status": "open",
    "profit": 0,
    "copiedFrom": null,
    "copiedBy": [],
    "createdAt": "2024-03-20T10:30:00.000Z"
  }
}
```

### 更新交易状态

**请求**:
```http
PUT /trades/:id/status
Content-Type: application/json

{
  "status": "won",
  "profit": 50,
  "transactionHash": "0xabc123..."
}
```

**响应**:
```json
{
  "message": "Trade status updated successfully",
  "trade": {
    "_id": "60f1b2c3d4e5f6789abc8888",
    "status": "won",
    "profit": 50,
    "transactionHash": "0xabc123...",
    "closedAt": "2024-03-21T10:30:00.000Z"
  }
}
```

### 获取交易统计

**请求**:
```http
GET /trades/stats/summary?traderId=...&period=30d
```

**查询参数**:
- `traderId` (string): 交易员 ID (必需)
- `period` (string): 时间周期 (1d, 7d, 30d, 90d)

**响应**:
```json
{
  "stats": {
    "period": "30d",
    "totalTrades": 50,
    "totalVolume": 15000,
    "winRate": "70.00",
    "totalProfit": 3000,
    "totalLoss": 1500,
    "netProfit": 1500,
    "avgTradeSize": 300
  }
}
```

## 风险管理

### 评估交易员风险

**请求**:
```http
GET /risk/trader/:traderId
```

**响应**:
```json
{
  "assessment": {
    "riskLevel": "low",
    "message": "Excellent trader with consistent performance",
    "score": "85",
    "stats": {
      "totalTrades": 150,
      "winRate": "68.5",
      "avgTradeAmount": "3333.33"
    }
  }
}
```

### 获取配置风险评估

**请求**:
```http
GET /risk/config/:configId
```

**响应**:
```json
{
  "config": {
    "_id": "60f1b2c3d4e5f6789abc7777",
    "follower": {
      "username": "follower1",
      "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
    },
    "trader": {
      "username": "toptrader",
      "totalTrades": 150,
      "winRate": 68.5,
      "profitLoss": 25000.5
    },
    "copyRatio": 0.5,
    "enabled": true
  },
  "riskSummary": {
    "totalCopiedTrades": 25,
    "totalCopiedAmount": 5000,
    "totalProfit": 1500,
    "totalLoss": 500,
    "netResult": 1000,
    "roi": "20.00",
    "dailyTradeCount": 3,
    "dailyAmount": 300,
    "dailyLimit": 1000,
    "dailyTradeLimit": 10,
    "enabled": true
  },
  "traderRisk": {
    "riskLevel": "low",
    "message": "Excellent trader with consistent performance",
    "score": "85",
    "stats": {
      "totalTrades": 150,
      "winRate": "68.5",
      "avgTradeAmount": "3333.33"
    }
  }
}
```

### 检查交易风险

**请求**:
```http
POST /risk/check-trade
Content-Type: application/json

{
  "configId": "60f1b2c3d4e5f6789abc7777",
  "tradeAmount": 100
}
```

**响应**:
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

### 获取用户风险统计

**请求**:
```http
GET /risk/stats/user/:userId
```

**响应**:
```json
{
  "stats": {
    "total": 5,
    "active": 3,
    "paused": 2,
    "totalCopiedTrades": 125,
    "totalCopiedAmount": 25000,
    "totalProfit": 7500,
    "totalLoss": 2500,
    "netResult": 5000
  }
}
```

## WebSocket 事件

### 连接
```
ws://localhost:3000/socket.io
```

### 加入用户房间
```json
{
  "event": "join-room",
  "data": "userId"
}
```

### 跟单交易通知
```json
{
  "event": "trade-copied",
  "data": {
    "tradeId": "60f1b2c3d4e5f6789abc8888",
    "originalTradeId": "60f1b2c3d4e5f6789abc7777",
    "marketTitle": "Will X win the election?",
    "amount": 50,
    "timestamp": "2024-03-20T10:30:00.000Z"
  }
}
```

## 错误响应

所有错误响应都遵循以下格式:

```json
{
  "error": "Error message"
}
```

### 常见错误码
- `400`: Bad Request - 请求参数错误
- `401`: Unauthorized - 未授权或 Token 无效
- `403`: Forbidden - 权限不足
- `404`: Not Found - 资源不存在
- `500`: Internal Server Error - 服务器内部错误

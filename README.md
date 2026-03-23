# Polymarket 跟单软件

一个功能完善的 Polymarket 跟单软件，支持自动复制交易员交易、风险控制和实时监控。

## 功能特性

### 核心功能
- 🔄 **自动跟单**: 实时监控交易员交易并自动复制
- 👥 **用户管理**: 钱包登录、用户认证、权限管理
- 📊 **市场数据**: 从 Polymarket API 同步最新市场数据
- 💰 **交易记录**: 完整的交易历史和统计分析
- 🎯 **风险控制**: 多层次风险管理和止损/止盈设置
- ⚡ **实时通知**: WebSocket 实时推送跟单状态

### 风险控制
- 每日交易数量限制
- 每日交易金额限制
- 止损百分比设置
- 止盈百分比设置
- 市场类别过滤
- 交易员风险评估
- 自动禁用超限配置

### 用户功能
- 钱包连接登录
- 查看热门交易员
- 浏览市场
- 管理跟单配置
- 查看交易记录
- 实时收益统计

## 技术栈

### 后端
- Node.js + Express
- MongoDB (数据存储)
- Ethers.js (Web3 交互)
- Socket.io (实时通信)
- Winston (日志管理)

### 前端
- React 18
- Vite
- React Router
- Axios
- Ethers.js
- Socket.io Client

### 区块链
- Polygon 网络
- Web3 钱包集成 (MetaMask)

## 安装部署

### 环境要求
- Node.js 18+
- MongoDB 5+
- MetaMask 钱包 (可选，用于测试)

### 后端安装

1. 克隆项目
```bash
cd polymarket-copy-trading
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/polymarket-copy-trading
JWT_SECRET=your-jwt-secret-key
POLYGON_RPC_URL=https://polygon-rpc.com
```

4. 启动后端服务
```bash
npm start
```

### 前端安装

1. 进入客户端目录
```bash
cd client
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:5173

## API 文档

### 认证 API

#### 钱包登录/注册
```
POST /api/auth/wallet
{
  "walletAddress": "0x...",
  "username": "user123",
  "email": "user@example.com"
}
```

#### 验证 Token
```
GET /api/auth/verify
Headers: Authorization: Bearer <token>
```

### 市场 API

#### 获取市场列表
```
GET /api/markets?category=politics&status=open&page=1&limit=50
```

#### 同步市场数据
```
POST /api/markets/sync
{
  "limit": 100
}
```

### 交易员 API

#### 获取热门交易员
```
GET /api/traders/top?limit=20&sortBy=profitLoss
```

#### 获取交易员详情
```
GET /api/traders/:id
```

#### 搜索交易员
```
GET /api/traders/search/:query
```

### 跟单 API

#### 创建跟单配置
```
POST /api/copy
{
  "followerId": "...",
  "traderId": "...",
  "copyRatio": 0.5,
  "minTradeAmount": 1,
  "maxTradeAmount": 1000,
  "maxDailyTrades": 10,
  "maxDailyAmount": 1000
}
```

#### 获取用户跟单配置
```
GET /api/copy/user/:userId
```

#### 更新跟单配置
```
PUT /api/copy/:id
{
  "enabled": true,
  "copyRatio": 0.8
}
```

#### 删除跟单配置
```
DELETE /api/copy/:id
```

### 交易 API

#### 创建交易
```
POST /api/trades
{
  "traderId": "...",
  "marketId": "...",
  "outcomeId": "...",
  "amount": 100,
  "price": 0.5,
  "direction": "yes"
}
```

#### 获取交易记录
```
GET /api/trades?traderId=...&status=open&page=1
```

#### 更新交易状态
```
PUT /api/trades/:id/status
{
  "status": "won",
  "profit": 50
}
```

### 风险控制 API

#### 评估交易员风险
```
GET /api/risk/trader/:traderId
```

#### 获取配置风险评估
```
GET /api/risk/config/:configId
```

#### 检查交易风险
```
POST /api/risk/check-trade
{
  "configId": "...",
  "tradeAmount": 100
}
```

## 数据模型

### User (用户)
- walletAddress: 钱包地址
- username: 用户名
- isTrader: 是否为交易员
- totalTrades: 总交易数
- winRate: 胜率
- profitLoss: 盈亏
- followers/following: 关注者/关注的交易员

### Market (市场)
- polymarketId: Polymarket 市场 ID
- title: 标题
- category: 分类
- outcomes: 选项
- status: 状态
- totalVolume: 总成交量

### Trade (交易)
- trader: 交易员
- market: 市场
- outcomeId: 选项 ID
- amount: 金额
- price: 价格
- direction: 方向 (yes/no)
- status: 状态
- profit: 盈利

### CopyConfig (跟单配置)
- follower: 跟随者
- trader: 被跟随的交易员
- copyRatio: 跟单比例
- min/maxTradeAmount: 最小/最大交易金额
- stopLoss/takeProfit: 止损/止盈百分比
- stats: 统计数据

## 使用流程

### 1. 用户注册/登录
- 连接 MetaMask 钱包
- 输入用户名注册
- 获得 JWT Token

### 2. 发现交易员
- 浏览热门交易员列表
- 查看交易员统计数据
- 评估交易员风险等级

### 3. 设置跟单
- 选择要跟随的交易员
- 配置跟单参数:
  - 跟单比例 (0.01 - 2.0)
  - 最小/最大交易金额
  - 每日交易限额
  - 止损/止盈设置
  - 市场类别过滤

### 4. 自动跟单
- 系统每 30 秒检查一次
- 当被跟随交易员有新交易时
- 根据配置自动复制交易
- 实时推送跟单通知

### 5. 监控和管理
- 查看跟单记录
- 统计收益和损失
- 随时暂停/停止跟单
- 调整跟单参数

## 安全性

- JWT Token 认证
- 钱包签名验证
- 风险限制检查
- SQL 注入防护
- XSS 防护

## 风险提示

⚠️ **重要提示**: 本软件仅用于学习和研究目的。实际使用时请注意:

1. 加密货币交易存在高风险
2. 跟单不能保证盈利
3. 请合理设置止损
4. 不要投入超过您能承受损失的资金
5. 做好风险管理和资金管理

## 开发计划

- [ ] 集成 Polymarket 实时 WebSocket
- [ ] 添加更多技术指标分析
- [ ] 实现社交功能 (评论、点赞)
- [ ] 移动端 App 开发
- [ ] 多语言支持
- [ ] 高级图表和数据分析

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提交 Issue。

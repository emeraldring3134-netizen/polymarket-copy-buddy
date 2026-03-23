# 系统架构文档

## 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Frontend (Vite)                               │  │
│  │  - Dashboard                                         │  │
│  │  - Markets Explorer                                  │  │
│  │  - Traders List                                      │  │
│  │  - Copy Trading Management                           │  │
│  │  - Trade History                                     │  │
│  └──────────────┬───────────────────────────────────────┘  │
└─────────────────┼─────────────────────────────────────────┘
                  │ HTTP/WebSocket
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express Server                                      │  │
│  │  - REST API Endpoints                                │  │
│  │  - WebSocket Server (Socket.io)                      │  │
│  │  - Authentication Middleware                         │  │
│  │  - Request Validation                                │  │
│  └──────────────┬───────────────────────────────────────┘  │
└─────────────────┼─────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│   MongoDB    │    │   Services   │
│              │    │              │
│  - Users     │    │  - API Layer │
│  - Markets   │    │  - Risk Ctrl │
│  - Trades    │    │  - Copy Mon  │
│  - CopyCfg   │    │  - Web3 Svc  │
└──────────────┘    └──────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │  External    │
                  │  Services   │
                  │              │
                  │ - Polymarket│
                  │ - Polygon   │
                  └──────────────┘
```

## 核心组件

### 1. 前端层 (Client Layer)

#### 技术栈
- React 18
- Vite (构建工具)
- React Router (路由)
- Axios (HTTP 客户端)
- Ethers.js (Web3 交互)
- Socket.io Client (实时通信)

#### 页面结构
```
src/
├── pages/
│   ├── Login.jsx           # 登录页面
│   ├── Dashboard.jsx       # 仪表板
│   ├── Markets.jsx         # 市场浏览
│   ├── Traders.jsx         # 交易员列表
│   ├── CopyTrades.jsx      # 跟单管理
│   └── TradeHistory.jsx    # 交易记录
├── services/
│   └── api.js             # API 服务封装
├── components/             # (预留) 共享组件
└── utils/                  # (预留) 工具函数
```

#### 状态管理
- 使用 React Hooks (useState, useEffect)
- 本地状态: 组件级状态
- 全局状态: (预留) Context API 或 Redux

### 2. API 网关层 (API Gateway)

#### 技术栈
- Express.js (Web 框架)
- Socket.io (WebSocket 服务)
- JWT (认证)
- Morgan/Winston (日志)

#### 路由结构
```
routes/
├── auth.js          # 认证路由
├── markets.js       # 市场路由
├── traders.js       # 交易员路由
├── copy.js          # 跟单配置路由
├── trades.js        # 交易路由
└── risk.js          # 风险管理路由
```

#### 中间件
```
middleware/
└── auth.js          # 认证中间件
```

### 3. 服务层 (Service Layer)

#### 服务模块
```
services/
├── polymarketApi.js    # Polymarket API 交互
├── web3Service.js      # Web3 区块链交互
├── copyMonitor.js      # 跟单监控服务
├── riskControl.js      # 风险控制服务
└── configManager.js    # 配置管理服务
```

#### 服务职责

**Polymarket API 服务**
- 获取市场列表
- 获取市场详情
- 同步市场数据
- 搜索市场
- 获取分类

**Web3 服务**
- 钱包连接
- 交易签名
- 余额查询
- 交易执行
- 区块链交互

**跟单监控服务**
- 定时监控交易员交易
- 自动复制交易
- 风险检查
- 状态更新
- 实时通知

**风险控制服务**
- 交易风险评估
- 止损/止盈检查
- 限额验证
- 风险评分
- 自动禁用超限配置

**配置管理服务**
- 创建跟单配置
- 更新配置
- 删除配置
- 批量操作
- 统计分析

### 4. 数据层 (Data Layer)

#### MongoDB 数据模型
```
models/
├── User.js           # 用户模型
├── Market.js         # 市场模型
├── Trade.js          # 交易模型
└── CopyConfig.js     # 跟单配置模型
```

#### 数据关系
```
User (1) ──< (N) Trade
User (1) ──< (N) CopyConfig (as follower)
User (1) ──< (N) CopyConfig (as trader)
User (N) ──< (N) User (followers/following)
Market (1) ──< (N) Trade
Trade (1) ──< (N) Trade (copiedBy)
Trade (N) ──< (1) Trade (copiedFrom)
```

### 5. 外部服务 (External Services)

#### Polymarket API
- 市场 API
- 交易 API
- 价格查询
- 订单簿查询

#### Polygon 网络
- 智能合约交互
- 交易执行
- 事件监听
- 余额查询

## 核心流程

### 1. 用户认证流程
```
1. 用户连接钱包 (MetaMask)
2. 获取钱包地址
3. 发送登录请求到后端
4. 后端验证地址并生成 JWT Token
5. 前端存储 Token
6. 后续请求携带 Token
```

### 2. 市场数据同步流程
```
1. 管理员触发同步
2. 调用 Polymarket API
3. 解析市场数据
4. 更新 MongoDB
5. 返回同步结果
```

### 3. 跟单监控流程
```
1. 定时任务启动 (每30秒)
2. 查询所有启用的跟单配置
3. 对每个配置:
   a. 检查每日限额
   b. 获取交易员新交易
   c. 风险评估
   d. 执行复制交易
   e. 发送通知
4. 更新统计数据
```

### 4. 交易执行流程
```
1. 用户发起交易 (或自动跟单)
2. 验交易参数
3. 检查余额
4. 构造交易
5. 签名交易
6. 发送到区块链
7. 监听交易确认
8. 更新交易状态
```

### 5. 风险控制流程
```
1. 交易前检查:
   - 验证配置是否启用
   - 检查每日限额
   - 验证金额范围
   - 检查止损/止盈
   - 验证市场类别
2. 交易后监控:
   - 更新统计
   - 检查是否触发止损
   - 自动禁用超限配置
```

## 数据流

### 读取流程
```
Client → API Gateway → Service Layer → MongoDB → Response → Client
```

### 写入流程
```
Client → API Gateway → Service Layer → Risk Check → MongoDB → External API/Blockchain → Response → Client
```

### 实时通知流程
```
Service Layer → Socket.io → Client (WebSocket)
```

## 安全架构

### 认证与授权
- JWT Token 认证
- Token 过期时间: 7天
- 每次请求验证 Token

### 数据安全
- MongoDB 连接认证
- 敏感数据加密
- 环境变量存储密钥
- SQL 注入防护

### 网络安全
- HTTPS (生产环境)
- CORS 配置
- 请求速率限制
- 输入验证

### 区块链安全
- 私钥安全存储
- 交易签名验证
- 金额范围限制

## 性能优化

### 缓存策略
- 市场数据缓存 (Redis - 预留)
- API 响应缓存
- 静态资源 CDN

### 数据库优化
- 索引优化
- 查询优化
- 分页查询
- 连接池配置

### 前端优化
- 代码分割
- 懒加载
- 资源压缩
- 浏览器缓存

### 后端优化
- PM2 集群模式
- 异步处理
- 批量操作
- 队列系统 (预留)

## 扩展性设计

### 水平扩展
- 无状态 API 服务
- 数据库读写分离
- 负载均衡
- 微服务架构 (预留)

### 功能扩展
- 插件系统 (预留)
- Webhook 支持 (预留)
- API 限流
- 多语言支持

## 监控与日志

### 日志管理
- Winston 日志框架
- 日志分级 (error, warn, info, debug)
- 日志轮转
- 日志聚合 (预留)

### 监控指标
- API 响应时间
- 错误率
- 数据库查询时间
- 系统资源使用
- WebSocket 连接数

### 告警机制
- 错误阈值告警
- 性能告警
- 资源告警
- 交易异常告警

## 部署架构

### 开发环境
```
本地开发:
- Vite Dev Server (前端)
- Node.js (后端)
- MongoDB Local
```

### 生产环境
```
Nginx (反向代理)
  ↓
PM2 Cluster (API 服务)
  ↓
MongoDB Replica Set
  ↓
Redis (缓存 - 预留)
```

## 技术债务与改进计划

### 当前限制
- 无 Redis 缓存
- 无消息队列
- 无完整的测试覆盖
- 无实时市场数据 WebSocket

### 未来改进
- [ ] 集成 Redis 缓存
- [ ] 使用消息队列处理异步任务
- [ ] 添加单元测试和集成测试
- [ ] 实现 WebSocket 实时数据推送
- [ ] 添加性能监控和告警
- [ ] 实现数据备份和恢复
- [ ] 优化数据库查询性能
- [ ] 添加限流和熔断机制

# Polymarket 跟单软件项目概述

## 项目简介

这是一个功能完善的 Polymarket 跟单软件，允许用户自动跟随优秀交易员进行市场预测交易。

## 核心功能

### ✅ 已实现功能

#### 1. 用户管理系统
- 钱包连接登录 (MetaMask)
- 用户注册和认证
- JWT Token 管理
- 用户权限管理

#### 2. 市场数据管理
- Polymarket API 数据同步
- 市场列表浏览
- 市场搜索和过滤
- 市场分类管理
- 市场详情展示

#### 3. 交易员管理
- 热门交易员展示
- 交易员搜索
- 交易员统计数据
- 交易员风险评估
- 交易员关注功能

#### 4. 跟单系统
- 自动跟单配置
- 跟单比例设置 (0.01x - 2.0x)
- 交易金额限制 (最小/最大)
- 每日交易数量限制
- 每日交易金额限制
- 市场类别过滤
- 实时跟单监控 (每30秒检查)

#### 5. 风险控制
- 止损百分比设置
- 止盈百分比设置
- 交易员风险评估
- 配置风险检查
- 自动禁用超限配置
- 风险统计分析

#### 6. 交易管理
- 交易记录创建
- 交易状态更新
- 交易历史查询
- 交易统计分析
- 盈亏计算

#### 7. 实时通知
- WebSocket 实时通信
- 跟单交易通知
- 状态更新推送

#### 8. Web3 集成
- Polygon 网络连接
- 钱包余额查询
- 交易签名和执行
- 交易状态监听

## 技术架构

### 后端技术栈
- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: MongoDB
- **区块链**: Ethers.js (Polygon)
- **实时通信**: Socket.io
- **日志**: Winston
- **认证**: JWT

### 前端技术栈
- **框架**: React 18
- **构建工具**: Vite
- **路由**: React Router
- **HTTP 客户端**: Axios
- **Web3**: Ethers.js
- **实时通信**: Socket.io Client

### 数据库模型
- **User**: 用户信息
- **Market**: 市场数据
- **Trade**: 交易记录
- **CopyConfig**: 跟单配置

## 项目结构

```
polymarket-copy-trading/
├── server.js              # 后端入口
├── package.json           # 后端依赖
├── .env.example           # 环境变量示例
├── models/                # 数据模型
│   ├── User.js           # 用户模型
│   ├── Market.js         # 市场模型
│   ├── Trade.js          # 交易模型
│   └── CopyConfig.js     # 跟单配置模型
├── routes/               # API 路由
│   ├── auth.js          # 认证路由
│   ├── markets.js       # 市场路由
│   ├── traders.js       # 交易员路由
│   ├── copy.js          # 跟单路由
│   ├── trades.js        # 交易路由
│   └── risk.js          # 风险管理路由
├── services/            # 业务服务
│   ├── polymarketApi.js # Polymarket API
│   ├── web3Service.js   # Web3 服务
│   ├── copyMonitor.js   # 跟单监控
│   ├── riskControl.js   # 风险控制
│   └── configManager.js # 配置管理
├── middleware/          # 中间件
│   └── auth.js         # 认证中间件
├── utils/              # 工具函数
│   └── logger.js       # 日志工具
├── client/             # 前端项目
│   ├── src/
│   │   ├── pages/     # 页面组件
│   │   ├── services/  # API 服务
│   │   ├── App.jsx    # 主应用
│   │   └── main.jsx   # 入口文件
│   ├── package.json   # 前端依赖
│   └── vite.config.js # Vite 配置
├── logs/               # 日志目录
├── README.md           # 项目说明
├── QUICKSTART.md       # 快速开始
├── API.md             # API 文档
├── ARCHITECTURE.md    # 架构文档
└── DEPLOYMENT.md      # 部署指南
```

## 核心流程

### 用户认证流程
1. 用户连接 MetaMask 钱包
2. 获取钱包地址
3. 发送登录请求到后端
4. 后端验证并生成 JWT Token
5. 前端存储 Token
6. 后续请求携带 Token 认证

### 跟单流程
1. 用户选择交易员
2. 创建跟单配置 (设置比例、限额等)
3. 系统每30秒检查交易员新交易
4. 发现新交易时进行风险评估
5. 通过风险检查则自动复制交易
6. 发送 WebSocket 通知给用户
7. 更新统计数据

### 交易执行流程
1. 用户发起交易 (或自动跟单)
2. 验证交易参数
3. 检查钱包余额
4. 构造交易数据
5. 用户签名交易
6. 发送到 Polygon 网络
7. 监听交易确认
8. 更新交易状态到数据库

## 安全特性

- ✅ JWT Token 认证
- ✅ 钱包签名验证
- ✅ 多层次风险限制
- ✅ 交易金额范围验证
- ✅ SQL/NoSQL 注入防护
- ✅ XSS 防护
- ✅ CORS 配置
- ✅ 请求输入验证

## 性能优化

- ✅ MongoDB 索引优化
- ✅ 分页查询
- ✅ 异步处理
- ✅ WebSocket 实时通信
- ✅ 批量操作支持

## API 接口

完整的 API 文档请参考 [API.md](API.md)

主要接口包括:
- `/api/auth/*` - 认证接口
- `/api/markets/*` - 市场接口
- `/api/traders/*` - 交易员接口
- `/api/copy/*` - 跟单接口
- `/api/trades/*` - 交易接口
- `/api/risk/*` - 风险管理接口

## 部署方式

### 开发环境
```bash
# 后端
npm install
npm start

# 前端
cd client
npm install
npm run dev
```

### 生产环境
详细部署指南请参考 [DEPLOYMENT.md](DEPLOYMENT.md)

支持:
- 传统服务器部署
- Docker 容器化部署
- PM2 进程管理
- Nginx 反向代理

## 文档资源

- **[README.md](README.md)** - 项目总览和详细说明
- **[QUICKSTART.md](QUICKSTART.md)** - 5分钟快速上手
- **[API.md](API.md)** - 完整 API 文档
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - 系统架构详解
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 部署指南

## 使用场景

1. **新手投资者**: 跟随专业交易员学习
2. **时间有限者**: 自动化跟单节省时间
3. **分散投资**: 同时跟随多个交易员
4. **风险管理**: 通过限额控制风险

## 风险提示

⚠️ **重要提示**:
- 本软件仅用于学习和研究目的
- 加密货币交易存在高风险
- 跟单不能保证盈利
- 历史表现不代表未来结果
- 请理性投资,做好风险管理
- 不要投入超过您能承受损失的资金

## 未来改进计划

- [ ] Redis 缓存集成
- [ ] 消息队列 (BullMQ)
- [ ] 完整的测试覆盖
- [ ] WebSocket 实时市场数据
- [ ] 性能监控和告警
- [ ] 数据备份自动化
- [ ] 移动端 App
- [ ] 多语言支持
- [ ] 社交功能 (评论、点赞)
- [ ] 高级图表和分析工具

## 技术支持

如有问题或建议:
1. 查阅项目文档
2. 提交 Issue
3. 参与讨论

## 许可证

MIT License

## 贡献

欢迎贡献代码、报告问题或提出改进建议!

---

**项目状态**: ✅ 核心功能已完成,可用于开发和测试
**最后更新**: 2026年3月23日

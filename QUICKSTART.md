# 快速开始指南

## 5 分钟快速上手

### 1. 环境准备

确保已安装以下软件:
- Node.js 18+
- MongoDB 5+
- Git

### 2. 克隆项目

```bash
git clone <repository-url>
cd polymarket-copy-trading
```

### 3. 后端设置

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 编辑 .env 文件,设置必要参数
# - MONGODB_URI: MongoDB 连接字符串
# - JWT_SECRET: JWT 密钥
# - PORT: 服务端口

# 启动 MongoDB
# Windows: 启动 MongoDB 服务
# Linux/Mac: sudo systemctl start mongod

# 启动后端服务
npm start
```

后端服务将在 `http://localhost:3000` 启动

### 4. 前端设置

```bash
# 进入客户端目录
cd client

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 `http://localhost:5173` 启动

### 5. 使用应用

1. 打开浏览器访问 `http://localhost:5173`
2. 点击"连接钱包"按钮 (需要安装 MetaMask)
3. 输入用户名完成注册
4. 开始使用!

## 功能测试

### 测试市场同步

1. 登录后进入"市场"页面
2. 点击"同步市场"按钮
3. 等待同步完成
4. 浏览同步的市场数据

### 测试跟单功能

1. 进入"交易员"页面
2. 查看热门交易员列表
3. 选择一个交易员点击"跟单"
4. 设置跟单比例
5. 确认跟单

### 测试风险管理

1. 进入"我的跟单"页面
2. 查看跟单配置
3. 编辑跟单参数
4. 设置止损/止盈
5. 暂停/启用跟单

## 常见问题

### Q: MongoDB 连接失败

**A**: 检查 MongoDB 服务是否启动:

```bash
# Linux/Mac
sudo systemctl status mongod

# Windows
# 检查 MongoDB 服务是否运行
```

确保 `.env` 中的 `MONGODB_URI` 配置正确。

### Q: 钱包连接失败

**A**: 
1. 确保已安装 MetaMask 浏览器插件
2. 确保已创建钱包账户
3. 尝试刷新页面重试

### Q: 前端无法连接后端

**A**: 
1. 检查后端服务是否启动: `http://localhost:3000/health`
2. 检查 `client/vite.config.js` 中的代理配置
3. 确保防火墙未阻止 3000 端口

### Q: 跟单没有生效

**A**: 
1. 检查跟单配置是否启用
2. 检查每日限额是否已满
3. 查看后端日志了解详情
4. 确保被跟随的交易员有新交易

## 开发模式

### 后端开发

使用 `--watch` 模式自动重启:

```bash
npm run dev
```

### 前端开发

Vite 开发服务器支持热更新:

```bash
cd client
npm run dev
```

### 调试

查看日志:

```bash
# 后端日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log
```

## 数据管理

### 重置数据库

```bash
# 连接到 MongoDB
mongosh

# 切换数据库
use polymarket-copy-trading

# 清空所有数据
db.users.deleteMany({})
db.markets.deleteMany({})
db.trades.deleteMany({})
db.copyconfigs.deleteMany({})
```

### 导出数据

```bash
mongodump --db polymarket-copy-trading --out ./backup
```

### 导入数据

```bash
mongorestore --db polymarket-copy-trading ./backup/polymarket-copy-trading
```

## 性能优化

### 启用缓存 (预留)

```bash
# 安装 Redis
# Ubuntu/Debian
sudo apt-get install redis-server

# 启动 Redis
redis-server

# 配置环境变量
REDIS_URI=redis://localhost:6379
```

### 数据库索引

索引已在模型中定义,启动时自动创建。

## 生产部署

详细部署说明请参考 [DEPLOYMENT.md](DEPLOYMENT.md)

### 简化部署

```bash
# 使用 PM2 部署
npm install -g pm2
pm2 start server.js --name "polymarket-api"
pm2 save
pm2 startup
```

### 构建前端

```bash
cd client
npm run build

# 构建产物在 client/dist 目录
```

## 安全建议

1. **更改默认密钥**: 生成强随机 JWT_SECRET
2. **启用 HTTPS**: 生产环境使用 SSL 证书
3. **配置防火墙**: 仅开放必要端口
4. **定期备份**: 设置数据库自动备份
5. **监控日志**: 定期检查错误日志
6. **更新依赖**: 定期更新安全补丁

## 技术支持

- 查看文档: [README.md](README.md)
- API 文档: [API.md](API.md)
- 架构文档: [ARCHITECTURE.md](ARCHITECTURE.md)
- 部署指南: [DEPLOYMENT.md](DEPLOYMENT.md)

## 下一步

- 阅读完整文档了解详细功能
- 查看 API 文档了解接口使用
- 根据需求进行二次开发
- 参与项目贡献

## 免责声明

⚠️ 本软件仅用于学习和研究目的。
- 加密货币交易存在高风险
- 跟单不能保证盈利
- 请理性投资,做好风险管理
- 作者不对任何损失负责

祝您使用愉快! 🚀

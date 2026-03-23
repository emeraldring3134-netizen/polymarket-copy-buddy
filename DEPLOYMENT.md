# 部署指南

## 生产环境部署

### 1. 服务器准备

推荐配置:
- CPU: 2 核心以上
- 内存: 4GB 以上
- 存储: 50GB 以上 SSD
- 操作系统: Ubuntu 20.04 或更高

### 2. 安装依赖

#### 安装 Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 安装 MongoDB
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 3. 配置环境变量

创建生产环境配置文件:
```bash
cp .env.example .env.production
```

编辑 `.env.production`:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/polymarket-copy-trading
JWT_SECRET=<生成强密钥>
POLYGON_RPC_URL=https://polygon-rpc.com
```

生成安全的 JWT Secret:
```bash
openssl rand -hex 32
```

### 4. 使用 PM2 管理进程

#### 安装 PM2
```bash
npm install -g pm2
```

#### 创建 ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'polymarket-api',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
```

#### 启动服务
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. 前端部署

#### 构建前端
```bash
cd client
npm install
npm run build
```

#### 使用 Nginx 托管静态文件

安装 Nginx:
```bash
sudo apt-get install -y nginx
```

配置 Nginx (`/etc/nginx/sites-available/polymarket`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 代理
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/polymarket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL 证书配置

使用 Let's Encrypt 免费证书:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 7. 设置防火墙

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 8. 监控和日志

#### 使用 PM2 监控
```bash
pm2 list
pm2 logs polymarket-api
pm2 monit
```

#### 配置日志轮转

创建 `/etc/logrotate.d/polymarket`:
```
/path/to/project/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### 9. 数据库备份

创建备份脚本 `/usr/local/bin/backup-mongodb.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb"
mkdir -p $BACKUP_DIR

mongodump --db polymarket-copy-trading --out $BACKUP_DIR/$DATE

# 保留最近 7 天的备份
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
```

设置定时任务:
```bash
crontab -e
```

添加:
```
0 2 * * * /usr/local/bin/backup-mongodb.sh
```

### 10. 安全加固

- 限制 MongoDB 访问
- 配置防火墙规则
- 定期更新系统和依赖
- 使用强密码和密钥
- 启用 MongoDB 认证

### 11. 性能优化

- 启用 MongoDB 索引
- 配置 Nginx 缓存
- 使用 CDN 加速静态资源
- 数据库连接池配置
- 启用 Gzip 压缩

## Docker 部署

### Dockerfile (后端)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### Dockerfile (前端)
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/polymarket-copy-trading
    depends_on:
      - mongodb
    restart: unless-stopped

  client:
    build:
      context: .
      dockerfile: Dockerfile.client
    ports:
      - "80:80"
    depends_on:
      - api
    restart: unless-stopped

  mongodb:
    image: mongo:6.0
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

启动:
```bash
docker-compose up -d
```

## 故障排查

### 常见问题

1. **MongoDB 连接失败**
   - 检查 MongoDB 服务状态: `sudo systemctl status mongod`
   - 检查防火墙设置
   - 验证连接字符串

2. **内存不足**
   - 使用 PM2 集群模式
   - 限制 Node.js 内存: `NODE_OPTIONS=--max-old-space-size=2048`

3. **WebSocket 连接失败**
   - 检查 Nginx 配置
   - 确认代理头设置正确

4. **前端构建失败**
   - 清除 node_modules: `rm -rf node_modules && npm install`
   - 检查 Node.js 版本

## 监控指标

关键指标:
- API 响应时间
- 数据库查询时间
- 错误率
- 内存使用率
- CPU 使用率
- WebSocket 连接数

推荐工具:
- PM2 Monit
- MongoDB Compass
- Grafana + Prometheus
- Sentry (错误追踪)

# Linux 服务器安装使用手册

## 一、系统要求

### 硬件要求
- CPU: 2核以上 (推荐 4核)
- 内存: 4GB 以上 (推荐 8GB)
- 硬盘: 50GB 可用空间 (SSD 推荐)
- 网络: 稳定的互联网连接

### 软件要求
- 操作系统: Ubuntu 20.04+ / Debian 10+ / CentOS 7+
- Node.js: 18.x 或更高版本
- MongoDB: 5.x 或更高版本
- Git (推荐)
- Nginx (用于生产环境)

## 二、准备工作

### 1. 更新系统

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. 安装基础工具

```bash
# Ubuntu/Debian
sudo apt install -y curl wget git vim build-essential

# CentOS/RHEL
sudo yum install -y curl wget git vim gcc-c++ make
```

### 3. 创建用户 (可选,推荐)

```bash
# 创建新用户
sudo adduser polymarket

# 添加到 sudo 组
sudo usermod -aG sudo polymarket

# 切换用户
su - polymarket
```

## 三、安装 Node.js

### 方式一: 使用 NodeSource (推荐)

```bash
# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

### 方式二: 使用 NVM (Node Version Manager)

```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载配置
source ~/.bashrc

# 安装 Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# 验证
node --version
```

### 配置 npm 使用国内镜像 (可选)

```bash
npm config set registry https://registry.npmmirror.com
npm config get registry
```

## 四、安装 MongoDB

### Ubuntu/Debian

```bash
# 导入 MongoDB 公钥
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# 添加 MongoDB 源
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# 更新包列表
sudo apt update

# 安装 MongoDB
sudo apt install -y mongodb-org

# 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod

# 验证服务
sudo systemctl status mongod
mongosh --eval "db.version()"
```

### CentOS/RHEL

```bash
# 创建 MongoDB 源文件
sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo <<EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

# 安装 MongoDB
sudo yum install -y mongodb-org

# 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod

# 验证
sudo systemctl status mongod
```

### 配置 MongoDB 远程访问 (可选)

编辑配置文件:
```bash
sudo vim /etc/mongod.conf
```

修改 bindIp:
```yaml
net:
  port: 27017
  bindIp: 0.0.0.0  # 允许远程访问
```

重启服务:
```bash
sudo systemctl restart mongod
```

### 创建 MongoDB 用户和数据库

```bash
mongosh

# 切换到 admin 数据库
use admin

# 创建管理员用户
db.createUser({
  user: "admin",
  pwd: "your-strong-password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# 创建应用数据库和用户
use polymarket-copy-trading
db.createUser({
  user: "polymarket",
  pwd: "your-app-password",
  roles: [ { role: "readWrite", db: "polymarket-copy-trading" } ]
})

exit
```

## 五、安装 PM2 (进程管理器)

```bash
sudo npm install -g pm2

# 设置 PM2 开机自启
pm2 startup
# 复制并执行输出的命令
pm2 save
```

## 六、安装 Nginx (生产环境)

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# 启动服务
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证
sudo systemctl status nginx
curl http://localhost
```

## 七、项目部署

### 1. 获取项目代码

```bash
# 克隆项目 (如果适用)
git clone <repository-url> polymarket-copy-trading
cd polymarket-copy-trading

# 或使用已有目录
cd /path/to/polymarket-copy-trading
```

### 2. 安装后端依赖

```bash
# 检查目录
ls -la

# 安装依赖
npm install
```

如果安装失败:
```bash
# 清除缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 3. 配置环境变量

```bash
# 复制配置文件
cp .env.example .env

# 编辑配置
vim .env
```

配置内容:
```env
# 环境设置
NODE_ENV=production
PORT=3000

# MongoDB 连接
MONGODB_URI=mongodb://localhost:27017/polymarket-copy-trading
# 或使用认证:
# MONGODB_URI=mongodb://polymarket:your-app-password@localhost:27017/polymarket-copy-trading

# JWT 密钥 (生成随机字符串)
JWT_SECRET=$(openssl rand -hex 32)

# Polymarket API
POLYMARKET_API=https://api.polymarket.com

# Polygon 网络
POLYGON_RPC_URL=https://polygon-rpc.com

# 前端地址
CLIENT_URL=http://your-domain.com

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 跟单默认设置
DEFAULT_COPY_RATIO=0.5
MIN_TRADE_AMOUNT=1
MAX_TRADE_AMOUNT=1000
```

生成安全的 JWT_SECRET:
```bash
openssl rand -hex 32
```

### 4. 创建日志目录

```bash
mkdir -p logs
chmod 755 logs
```

### 5. 创建 PM2 配置文件

创建 `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'polymarket-api',
    script: 'server.js',
    cwd: '/path/to/polymarket-copy-trading',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

### 6. 启动后端服务

```bash
# 开发模式
npm run dev

# 生产模式 (使用 PM2)
pm2 start ecosystem.config.js
pm2 save

# 查看状态
pm2 list
pm2 logs polymarket-api
```

### 7. 验证服务

```bash
# 健康检查
curl http://localhost:3000/health

# 应返回: {"status":"ok","timestamp":"..."}
```

## 八、前端部署

### 1. 安装前端依赖

```bash
cd client
npm install
```

### 2. 开发模式 (仅测试)

```bash
npm run dev
```

### 3. 生产构建

```bash
npm run build
```

构建产物在 `dist` 目录。

### 4. 配置 Nginx

创建 Nginx 配置文件:
```bash
sudo vim /etc/nginx/sites-available/polymarket
```

配置内容:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 前端静态文件
    location / {
        root /path/to/polymarket-copy-trading/client/dist;
        try_files $uri $uri/ /index.html;
        index index.html;

        # 启用 gzip 压缩
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
        gzip_min_length 1000;
    }

    # API 反向代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 代理
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /path/to/polymarket-copy-trading/client/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置:
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/polymarket /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## 九、配置防火墙

### Ubuntu (UFW)

```bash
# 启用防火墙
sudo ufw enable

# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP
sudo ufw allow 80/tcp

# 允许 HTTPS (后续配置)
sudo ufw allow 443/tcp

# 允许 MongoDB (仅本地访问)
sudo ufw allow from 127.0.0.1 to any port 27017

# 查看状态
sudo ufw status
```

### CentOS (firewalld)

```bash
# 启用防火墙
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 开放端口
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

## 十、配置 SSL 证书 (HTTPS)

### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

更新 Nginx 配置会自动添加 SSL。

## 十一、使用指南

### 1. 启动服务

```bash
# 启动 MongoDB
sudo systemctl start mongod

# 启动后端
pm2 start ecosystem.config.js

# 启动 Nginx
sudo systemctl start nginx
```

### 2. 查看服务状态

```bash
# MongoDB
sudo systemctl status mongod

# PM2 应用
pm2 list
pm2 logs polymarket-api

# Nginx
sudo systemctl status nginx
```

### 3. 访问应用

浏览器访问: `http://your-domain.com`

## 十二、日常维护

### 查看 PM2 日志

```bash
# 实时日志
pm2 logs polymarket-api

# 错误日志
pm2 logs polymarket-api --err

# 清空日志
pm2 flush
```

### 查看应用日志

```bash
# 后端日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log
```

### MongoDB 维护

```bash
# 连接到 MongoDB
mongosh

# 查看数据库
show dbs

# 使用数据库
use polymarket-copy-trading

# 查看集合
show collections

# 查看统计
db.users.countDocuments()
db.markets.countDocuments()
db.trades.countDocuments()
```

### 数据库备份

创建备份脚本 `/usr/local/bin/backup-mongodb.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb"
mkdir -p $BACKUP_DIR

# 备份数据库
mongodump --db polymarket-copy-trading --out $BACKUP_DIR/$DATE

# 压缩备份
tar -czf $BACKUP_DIR/$DATE.tar.gz $BACKUP_DIR/$DATE
rm -rf $BACKUP_DIR/$DATE

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

设置权限:
```bash
sudo chmod +x /usr/local/bin/backup-mongodb.sh
```

设置定时任务:
```bash
# 编辑 crontab
crontab -e

# 添加定时任务 (每天凌晨 2 点备份)
0 2 * * * /usr/local/bin/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

### 数据库恢复

```bash
# 解压备份
tar -xzf /backup/mongodb/20240323_020000.tar.gz -C /tmp

# 恢复
mongorestore --db polymarket-copy-trading /tmp/20240323_020000/polymarket-copy-trading
```

## 十三、监控和告警

### PM2 监控

```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 show polymarket-api

# 重启应用
pm2 restart polymarket-api

# 停止应用
pm2 stop polymarket-api
```

### 系统资源监控

```bash
# CPU 和内存
htop

# 磁盘使用
df -h

# 进程监控
ps aux | grep node

# 网络连接
netstat -tuln
```

## 十四、常见问题解决

### 问题1: 端口被占用

```bash
# 查找占用端口的进程
sudo lsof -i :3000

# 结束进程
sudo kill -9 <PID>
```

### 问题2: MongoDB 连接失败

```bash
# 检查服务状态
sudo systemctl status mongod

# 查看日志
sudo tail -f /var/log/mongodb/mongod.log

# 重启服务
sudo systemctl restart mongod
```

### 问题3: 权限问题

```bash
# 修复文件权限
sudo chown -R $USER:$USER /path/to/polymarket-copy-trading
chmod -R 755 /path/to/polymarket-copy-trading
```

### 问题4: 内存不足

```bash
# 限制 Node.js 内存
# 在 ecosystem.config.js 中添加
max_memory_restart: '1G'

# 或在 .env 中添加
NODE_OPTIONS=--max-old-space-size=1024
```

## 十五、性能优化

### 1. 启用 MongoDB 索引

```bash
mongosh polymarket-copy-trading

# 创建索引
db.users.createIndex({ walletAddress: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.markets.createIndex({ category: 1, status: 1 })
db.markets.createIndex({ endDate: 1 })
db.trades.createIndex({ trader: 1, createdAt: -1 })
db.trades.createIndex({ status: 1 })
db.copyconfigs.createIndex({ follower: 1, trader: 1 }, { unique: true })
```

### 2. Nginx 性能优化

编辑 `/etc/nginx/nginx.conf`:
```nginx
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
}

http {
    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # 缓存配置
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

    include /etc/nginx/sites-enabled/*;
}
```

创建缓存目录:
```bash
sudo mkdir -p /var/cache/nginx
sudo chown -R www-data:www-data /var/cache/nginx
```

### 3. Node.js 性能优化

```bash
# 增加 ulimit
ulimit -n 65535

# 永久设置
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf
```

## 十六、安全加固

### 1. 配置防火墙规则

```bash
# 只允许必要的端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. 配置 MongoDB 认证

参考前面"创建 MongoDB 用户"部分。

### 3. 配置 SSH 安全

编辑 `/etc/ssh/sshd_config`:
```bash
# 禁用 root 登录
PermitRootLogin no

# 禁用密码登录 (使用密钥)
PasswordAuthentication no

# 更改默认端口 (可选)
Port 2222
```

重启 SSH:
```bash
sudo systemctl restart sshd
```

### 4. 设置文件权限

```bash
# 保护敏感文件
chmod 600 .env
chmod 600 ~/.ssh/id_rsa

# 项目目录权限
chmod 755 .
```

## 十七、更新和升级

### 更新依赖

```bash
# 检查过时的包
npm outdated

# 更新依赖
npm update

# 更新到最新版本
npm install npm@latest -g
npm install -g n
n latest
```

### 更新系统

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

## 十八、故障排查检查清单

- [ ] MongoDB 服务是否运行
- [ ] PM2 应用是否正常
- [ ] Nginx 是否运行
- [ ] 端口是否开放
- [ ] 防火墙规则是否正确
- [ ] 日志文件是否有错误
- [ ] 磁盘空间是否充足
- [ ] 内存是否充足
- [ ] 环境变量是否正确
- [ ] 配置文件是否正确

## 十九、卸载

### 停止服务

```bash
# PM2
pm2 stop all
pm2 delete all
pm2 kill

# MongoDB
sudo systemctl stop mongod
sudo systemctl disable mongod

# Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### 卸载软件

```bash
# MongoDB
sudo apt purge mongodb-org* -y
sudo apt autoremove -y

# Node.js
sudo apt purge nodejs npm -y

# Nginx
sudo apt purge nginx* -y

# PM2
sudo npm uninstall -g pm2
```

### 删除项目文件

```bash
rm -rf /path/to/polymarket-copy-trading
rm -rf /backup/mongodb
rm -rf /var/log/mongodb
```

## 二十、生产环境推荐配置

### 服务器配置
- **CPU**: 4核以上
- **内存**: 8GB 以上
- **存储**: 100GB SSD
- **带宽**: 100Mbps 以上

### MongoDB 配置
- 使用 Replica Set
- 启用日志轮转
- 定期备份

### 应用配置
- 使用 PM2 集群模式 (4 实例)
- 启用日志轮转
- 配置监控告警

### 安全配置
- 启用 HTTPS
- 配置防火墙
- 定期更新

---

**文档版本**: v1.0
**最后更新**: 2026年3月23日
**适用系统**: Ubuntu 20.04+, Debian 10+, CentOS 7+

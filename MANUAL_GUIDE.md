# 操作手册索引

## 选择合适的平台

本程序可以在 **Windows** 或 **Linux 服务器**上运行,请根据您的需求选择:

- **Windows 适合**: 本地开发、测试、个人使用
- **Linux 适合**: 生产环境、团队协作、服务器部署

## 文档导航

### 📋 Windows 平台

**适用场景**:
- 个人电脑本地运行
- 开发测试环境
- 学习和演示

**详细文档**: [Windows 安装使用手册](MANUAL_WINDOWS.md)

**快速命令**:
```cmd
# 1. 启动 MongoDB
net start MongoDB

# 2. 启动后端
cd c:\Users\user\CodeBuddy\20260323164629
npm install
npm start

# 3. 启动前端 (新窗口)
cd client
npm install
npm run dev
```

访问: http://localhost:5173

---

### 🐧 Linux 服务器

**适用场景**:
- 生产环境部署
- 24/7 运行
- 多用户访问
- 团队协作

**详细文档**: [Linux 服务器安装使用手册](MANUAL_LINUX.md)

**快速命令**:
```bash
# 1. 安装依赖
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs mongodb-org nginx

# 2. 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod

# 3. 部署应用
cd /path/to/polymarket-copy-trading
npm install
cp .env.example .env
vim .env  # 配置环境变量

# 4. 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 5. 配置 Nginx
sudo vim /etc/nginx/sites-available/polymarket
sudo ln -s /etc/nginx/sites-available/polymarket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

访问: http://your-server-ip

---

## 核心差异对比

| 特性 | Windows | Linux 服务器 |
|------|---------|--------------|
| **适用场景** | 本地开发 | 生产环境 |
| **启动方式** | 手动启动 / PM2 | PM2 自动 |
| **Web 服务器** | 无需配置 | Nginx |
| **访问方式** | localhost | 域名 / 公网 IP |
| **性能** | 基础 | 优化配置 |
| **安全性** | 基础 | 完整配置 |
| **维护** | 手动 | 自动化 |
| **HTTPS** | 不需要 | 推荐 |
| **成本** | 免费 | 需要服务器 |

## 推荐使用场景

### 选择 Windows 如果:
- ✅ 只是想测试和体验功能
- ✅ 个人使用,不对外公开
- ✅ 不熟悉 Linux 命令行
- ✅ 只有一台 Windows 电脑
- ✅ 开发调试阶段

### 选择 Linux 如果:
- ✅ 需要 24/7 稳定运行
- ✅ 需要多人同时访问
- ✅ 需要使用域名访问
- ✅ 需要配置 HTTPS
- ✅ 正式上线使用
- ✅ 团队协作开发

## 云服务器推荐

如果选择 Linux 服务器,可以使用以下云服务商:

### 国内
- **阿里云**: https://www.aliyun.com/
- **腾讯云**: https://cloud.tencent.com/
- **华为云**: https://www.huaweicloud.com/

### 国外
- **AWS**: https://aws.amazon.com/
- **DigitalOcean**: https://www.digitalocean.com/
- **Vultr**: https://www.vultr.com/

### 推荐配置
- **CPU**: 2核或以上
- **内存**: 4GB 或以上
- **存储**: 50GB SSD
- **带宽**: 5Mbps 或以上
- **系统**: Ubuntu 20.04 LTS

## 快速决策指南

回答以下问题,快速决定使用哪个平台:

### 问题1: 你的用途是什么?
- A. 个人测试学习 → **Windows**
- B. 正式上线使用 → **Linux**

### 问题2: 谁会访问应用?
- A. 只有我自己 → **Windows**
- B. 多人访问 → **Linux**

### 问题3: 是否需要外网访问?
- A. 不需要 → **Windows**
- B. 需要 → **Linux**

### 问题4: 你的技术水平?
- A. 不熟悉 Linux → **Windows**
- B. 熟悉 Linux 命令 → **Linux**

### 问题5: 预算考虑?
- A. 免费使用 → **Windows**
- B. 可以付费 → **Linux**

---

## 安装步骤对比

### Windows (8步)
1. ✅ 安装 Node.js
2. ✅ 安装 MongoDB
3. ✅ 安装 MetaMask
4. ✅ 配置环境变量
5. ✅ 安装项目依赖
6. ✅ 启动 MongoDB
7. ✅ 启动后端服务
8. ✅ 启动前端服务

**预计时间**: 30-60 分钟

### Linux (10步)
1. ✅ 更新系统
2. ✅ 安装 Node.js
3. ✅ 安装 MongoDB
4. ✅ 安装 Nginx
5. ✅ 安装 PM2
6. ✅ 配置环境变量
7. ✅ 部署后端服务
8. ✅ 构建前端
9. ✅ 配置 Nginx
10. ✅ 配置防火墙

**预计时间**: 1-2 小时

## 常见问题 FAQ

### Q1: 可以在 Windows 开发,Linux 上线吗?

**A**: 可以!这是标准做法:
- 在 Windows 本地开发测试
- 在 Linux 服务器部署上线
- 代码完全兼容

### Q2: 我有 Windows 电脑,需要买 Linux 服务器吗?

**A**: 看需求:
- 个人使用 → 不需要,用 Windows 即可
- 团队使用/对外服务 → 需要,购买云服务器
- 成本约 ¥50-200/月

### Q3: 两边的代码一样吗?

**A**: 是的!代码完全一样:
- 无需修改任何代码
- 只需配置不同的环境变量
- Linux 需要额外配置 Nginx

### Q4: 如何从 Windows 迁移到 Linux?

**A**: 简单迁移步骤:
```bash
# 1. 备份数据库
mongodump --db polymarket-copy-trading --out backup

# 2. 上传代码到 Linux
scp -r polymarket-copy-trading user@server:/path/

# 3. 在 Linux 上部署
cd /path/to/polymarket-copy-trading
npm install
# ... 按照 Linux 手册继续
```

### Q5: 数据库迁移怎么办?

**A**: 使用 MongoDB 导出导入:
```bash
# Windows 导出
mongodump --db polymarket-copy-trading --out backup

# Linux 导入
mongorestore --db polymarket-copy-trading backup/polymarket-copy-trading
```

## 学习路径建议

### 初学者
1. 先在 Windows 本地安装体验
2. 学习基本功能和使用
3. 熟悉后再考虑 Linux 部署

### 有经验者
1. 直接在 Linux 服务器部署
2. 参考详细的 Linux 手册
3. 按照生产环境最佳实践配置

### 团队开发
1. Windows 本地开发
2. Linux 测试环境
3. Linux 生产环境
4. 使用 Git 管理代码

## 技术支持

### 遇到问题?

1. **查看日志**
   - Windows: 查看 `logs/` 目录
   - Linux: 使用 `pm2 logs`

2. **检查服务**
   - Windows: 检查进程和服务
   - Linux: `systemctl status mongod`

3. **阅读文档**
   - Windows 手册
   - Linux 手册
   - API 文档
   - 架构文档

4. **社区支持**
   - 提交 Issue
   - 参与讨论
   - 寻求帮助

## 下一步

1. **选择平台**: 根据需求选择 Windows 或 Linux
2. **阅读对应手册**: 点击上方链接查看详细文档
3. **按步骤安装**: 跟随手册逐步完成安装
4. **开始使用**: 部署完成后开始使用

---

**文档版本**: v1.0
**最后更新**: 2026年3月23日

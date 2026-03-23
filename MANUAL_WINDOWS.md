# Windows 安装使用手册

## 一、系统要求

### 硬件要求
- CPU: Intel i5 或更高 / AMD 同级别
- 内存: 8GB 以上 (推荐 16GB)
- 硬盘: 20GB 可用空间
- 网络: 稳定的互联网连接

### 软件要求
- 操作系统: Windows 10 或 Windows 11 (64位)
- Node.js: 18.x 或更高版本
- MongoDB: 5.x 或更高版本
- Git (可选,用于版本控制)
- 浏览器: Chrome, Firefox 或 Edge (支持 MetaMask)

## 二、安装准备

### 1. 安装 Node.js

#### 方式一: 官网安装
1. 访问 https://nodejs.org/
2. 下载 **LTS 版本** (推荐)
3. 运行安装程序,按提示完成安装
4. 验证安装:
   ```cmd
   node --version
   npm --version
   ```

#### 方式二: 使用 nvm-windows (推荐多版本管理)
1. 访问 https://github.com/coreybutler/nvm-windows/releases
2. 下载 `nvm-setup.exe`
3. 运行安装程序
4. 打开新的命令提示符:
   ```cmd
   nvm install 18.19.0
   nvm use 18.19.0
   node --version
   ```

### 2. 安装 MongoDB

#### 方式一: 使用 MongoDB Community Server
1. 访问 https://www.mongodb.com/try/download/community
2. 选择 Windows 版本
3. 下载 `.msi` 安装包
4. 运行安装程序:
   - 选择 "Complete" 完整安装
   - 勾选 "Install MongoDB as a Windows Service"
   - 勾选 "Install MongoDB Compass" (图形化管理工具)
   - 数据目录: `C:\data\db`
   - 日志目录: `C:\data\log`
5. 完成

#### 启动 MongoDB 服务
```cmd
# 方式一: 通过服务管理器
# 按 Win+R,输入 services.msc
# 找到 "MongoDB" 服务,右键启动

# 方式二: 通过命令行
net start MongoDB

# 验证服务状态
net stat -ano | findstr 27017
```

### 3. 安装 Git (可选)

1. 访问 https://git-scm.com/download/win
2. 下载安装包
3. 运行安装程序,使用默认设置即可
4. 验证安装:
   ```cmd
   git --version
   ```

### 4. 安装 MetaMask 浏览器插件

1. 打开 Chrome/Edge 浏览器
2. 访问 https://metamask.io/download/
3. 点击 "Install MetaMask for Chrome/Edge"
4. 添加到浏览器
5. 创建钱包账户并保存助记词

## 三、项目部署

### 1. 获取项目代码

#### 方式一: 如果已经有代码目录
直接使用现有目录 `c:/Users/user/CodeBuddy/20260323164629`

#### 方式二: 从 GitHub 克隆 (如果适用)
```cmd
cd C:\Users\user\CodeBuddy
git clone <repository-url> polymarket-copy-trading
cd polymarket-copy-trading
```

### 2. 安装后端依赖

```cmd
cd c:\Users\user\CodeBuddy\20260323164629

# 检查 package.json 是否存在
dir package.json

# 安装依赖
npm install
```

如果安装速度慢,使用国内镜像:
```cmd
npm config set registry https://registry.npmmirror.com
npm install
```

### 3. 配置环境变量

#### 创建配置文件
```cmd
copy .env.example .env
```

#### 编辑 .env 文件
使用记事本或 VS Code 编辑:

```env
# 环境设置
NODE_ENV=development
PORT=3000

# MongoDB 连接 (Windows 本地)
MONGODB_URI=mongodb://localhost:27017/polymarket-copy-trading

# JWT 密钥 (请修改为随机字符串)
JWT_SECRET=your-very-secure-random-secret-key-change-this

# Polymarket API
POLYMARKET_API=https://api.polymarket.com

# Polygon 网络
POLYGON_RPC_URL=https://polygon-rpc.com

# 前端地址
CLIENT_URL=http://localhost:5173

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 跟单默认设置
DEFAULT_COPY_RATIO=0.5
MIN_TRADE_AMOUNT=1
MAX_TRADE_AMOUNT=1000
```

**生成安全的 JWT_SECRET**:
```cmd
# 在 PowerShell 中
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 4. 创建日志目录

```cmd
mkdir logs
```

### 5. 启动 MongoDB

```cmd
net start MongoDB
```

如果服务未安装,手动启动:
```cmd
# 创建数据目录
mkdir C:\data\db

# 启动 MongoDB
"C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" --dbpath C:\data\db
```

### 6. 启动后端服务

#### 开发模式 (推荐)
```cmd
npm run dev
```

#### 生产模式
```cmd
npm start
```

#### 验证服务
浏览器访问: http://localhost:3000/health
应该看到: `{"status":"ok","timestamp":"..."}`

## 四、前端部署

### 1. 安装前端依赖

```cmd
cd c:\Users\user\CodeBuddy\20260323164629\client

# 检查 package.json
dir package.json

# 安装依赖
npm install
```

### 2. 启动前端开发服务器

```cmd
npm run dev
```

访问: http://localhost:5173

### 3. 生产构建 (可选)

```cmd
npm run build
```

构建产物在 `dist` 目录,可用于 Nginx 托管。

## 五、防火墙配置

### 允许端口访问

1. 按 `Win+R`,输入 `wf.msc` 打开防火墙
2. 左侧点击 "入站规则"
3. 右侧 "新建规则"
4. 选择 "端口" → "TCP"
5. 输入端口: `3000,5173`
6. 选择 "允许连接"
7. 勾选所有网络类型
8. 命名规则: "Polymarket App"

## 六、后台运行

### 使用 PM2 (推荐)

#### 安装 PM2
```cmd
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

#### 创建 ecosystem 文件
创建 `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'polymarket-api',
    script: 'server.js',
    instances: 2,
    exec_mode: 'fork',
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
```cmd
pm2 start ecosystem.config.js
pm2 save
```

#### 常用命令
```cmd
# 查看状态
pm2 list

# 查看日志
pm2 logs polymarket-api

# 重启服务
pm2 restart polymarket-api

# 停止服务
pm2 stop polymarket-api

# 删除服务
pm2 delete polymarket-api
```

### 使用 Windows 服务 (高级)

使用 `node-windows` 创建 Windows 服务:

```cmd
npm install -g node-windows
```

创建服务脚本 `install-service.js`:
```javascript
var Service = require('node-windows').Service;

var svc = new Service({
  name: 'Polymarket API',
  description: 'Polymarket Copy Trading API Server',
  script: 'c:\\Users\\user\\CodeBuddy\\20260323164629\\server.js',
  nodeOptions: ['--harmony', '--max_old_space_size=4096']
});

svc.on('install', function(){
  svc.start();
});

svc.install();
```

安装服务:
```cmd
node install-service.js
```

## 七、使用指南

### 1. 启动应用

#### 完整启动流程
```cmd
# 1. 启动 MongoDB
net start MongoDB

# 2. 启动后端
cd c:\Users\user\CodeBuddy\20260323164629
npm start

# 3. 启动前端 (新开命令窗口)
cd c:\Users\user\CodeBuddy\20260323164629\client
npm run dev
```

### 2. 访问应用

1. 打开浏览器
2. 访问: http://localhost:5173
3. 连接 MetaMask 钱包
4. 注册/登录账户

### 3. 基本操作

#### 同步市场数据
- 进入"市场"页面
- 点击"同步市场"按钮
- 等待同步完成

#### 查看交易员
- 进入"交易员"页面
- 浏览热门交易员列表
- 查看统计数据

#### 设置跟单
- 选择交易员点击"跟单"
- 设置跟单比例 (0.5 表示交易员交易100,你跟单50)
- 设置金额限制
- 确认跟单

#### 查看跟单
- 进入"我的跟单"页面
- 查看跟单配置
- 编辑或暂停跟单

## 八、常见问题解决

### 问题1: MongoDB 无法启动

**症状**: 服务启动失败

**解决方案**:
```cmd
# 检查服务状态
sc query MongoDB

# 手动启动
"C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" --dbpath C:\data\db

# 查看日志
type C:\data\log\mongod.log
```

### 问题2: 端口被占用

**症状**: `EADDRINUSE: address already in use`

**解决方案**:
```cmd
# 查找占用端口的进程
netstat -ano | findstr :3000

# 结束进程
taskkill /PID <进程ID> /F

# 或修改 .env 中的 PORT
PORT=3001
```

### 问题3: npm install 失败

**症状**: 依赖安装错误

**解决方案**:
```cmd
# 清除缓存
npm cache clean --force

# 删除 node_modules
rmdir /s /q node_modules

# 重新安装
npm install
```

### 问题4: 钱包连接失败

**症状**: 无法连接 MetaMask

**解决方案**:
1. 确保已安装 MetaMask 插件
2. 刷新页面
3. 检查浏览器控制台错误 (F12)
4. 确保浏览器允许钱包权限

### 问题5: 跟单没有生效

**症状**: 跟单配置已创建但没有执行

**解决方案**:
1. 检查配置是否启用
2. 查看后端日志: `type logs\combined.log`
3. 确认被跟随交易员有新交易
4. 检查每日限额是否已满

## 九、维护和监控

### 查看日志

```cmd
# 实时查看后端日志
type logs\combined.log

# 查看错误日志
type logs\error.log

# PM2 日志
pm2 logs
```

### MongoDB 维护

```cmd
# 连接到 MongoDB
mongosh

# 查看数据库
show dbs

# 使用数据库
use polymarket-copy-trading

# 查看集合
show collections

# 查看用户数量
db.users.countDocuments()

# 清空测试数据
db.users.deleteMany({})
```

### 数据库备份

```cmd
# 创建备份目录
mkdir C:\backup

# 备份数据库
"C:\Program Files\MongoDB\Server\5.0\bin\mongodump.exe" --db polymarket-copy-trading --out C:\backup
```

### 数据库恢复

```cmd
"C:\Program Files\MongoDB\Server\5.0\bin\mongorestore.exe" --db polymarket-copy-trading C:\backup\polymarket-copy-trading
```

## 十、卸载

### 停止服务

```cmd
# 停止 MongoDB
net stop MongoDB

# 停止 PM2 进程
pm2 stop all
pm2 delete all
```

### 卸载软件

1. 控制面板 → 程序和功能
2. 卸载 MongoDB
3. 卸载 Node.js
4. 卸载 Git (可选)

### 删除项目文件

```cmd
cd C:\Users\user\CodeBuddy
rmdir /s /q 20260323164629
```

## 十一、安全建议

1. **修改默认密钥**: 更改 .env 中的 JWT_SECRET
2. **使用强密码**: 数据库和钱包使用强密码
3. **定期备份**: 设置自动数据库备份
4. **更新软件**: 定期更新 Node.js 和依赖
5. **防火墙**: 只开放必要端口
6. **杀毒软件**: 保持杀毒软件更新

## 十二、性能优化

### 启用 Windows 性能模式

1. 控制面板 → 电源选项
2. 选择"高性能"模式

### MongoDB 优化

编辑 MongoDB 配置文件 `C:\Program Files\MongoDB\Server\5.0\bin\mongod.cfg`:
```yaml
storage:
  dbPath: C:\data\db
  journal:
    enabled: true
systemLog:
  destination: file
  path: C:\data\log\mongod.log
net:
  port: 27017
  bindIp: 127.0.0.1
```

重启 MongoDB 服务。

### Node.js 优化

在 .env 中添加:
```env
NODE_OPTIONS=--max-old-space-size=4096
```

## 十三、故障排查检查清单

- [ ] MongoDB 服务是否运行
- [ ] 端口 3000 和 5173 是否可用
- [ ] 环境变量是否正确配置
- [ ] 依赖是否完整安装
- [ ] 日志文件是否有错误信息
- [ ] 防火墙是否阻止连接
- [ ] MetaMask 是否正确连接
- [ ] 浏览器控制台是否有错误

## 十四、联系支持

遇到问题时:
1. 查看日志文件
2. 参考文档 (README.md, API.md)
3. 检查常见问题部分
4. 提交 Issue 或寻求帮助

---

**文档版本**: v1.0
**最后更新**: 2026年3月23日
**适用系统**: Windows 10/11 (64位)

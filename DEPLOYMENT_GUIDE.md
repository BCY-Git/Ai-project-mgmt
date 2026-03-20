# AI Project Management System - 部署指南

本指南将帮助您在全新的 Linux 服务器上部署 AI 项目管理系统。

## 服务器信息

- **IP 地址**: 106.54.44.45
- **SSH 端口**: 22
- **用户**: root
- **连接命令**: `ssh root@106.54.44.45`

## 目录

1. [准备阶段](#准备阶段)
2. [部署步骤](#部署步骤)
3. [服务器操作脚本](#服务器操作脚本)
4. [一键部署脚本](#一键部署脚本)
5. [常见错误处理](#常见错误处理)
6. [性能优化建议](#性能优化建议)

---

## 准备阶段

### 1. 连接到服务器

```bash
ssh root@106.54.44.45 -p 22
```

首次连接时会提示接受服务器指纹，输入 `yes` 即可。

### 2. 更新系统

```bash
# 更新软件包列表
apt update

# 升级已安装的软件包
apt upgrade -y

# 清理不需要的软件包
apt autoremove -y
```

**预期输出示例**：
```
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
```

### 3. 安装 Docker 和 Docker Compose

运行服务器初始化脚本：

```bash
# 如果已经在本地，可以直接运行
./server-setup.sh

# 或者手动执行以下命令
```

**手动安装 Docker**：

```bash
# 安装必要的软件包
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 更新软件包列表
apt update

# 安装 Docker Engine
apt install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker 服务
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

**预期输出示例**：
```
Docker version 24.0.5, build ced0996
Docker Compose version v2.20.0
```

### 4. 配置防火墙

```bash
# 安装 UFW（如果没有安装）
apt install -y ufw

# 重置防火墙规则
ufw --force reset

# 允许 SSH（端口 22）
ufw allow 22/tcp

# 允许 HTTP（端口 80）
ufw allow 80/tcp

# 允许 HTTPS（端口 443）
ufw allow 443/tcp

# 启用防火墙
ufw --force enable

# 检查防火墙状态
ufw status
```

**预期输出示例**：
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere (v6)
80/tcp (v6)                ALLOW       Anywhere (v6)
443/tcp (v6)               ALLOW       Anywhere (v6)
```

---

## 部署步骤

### 1. 上传项目文件到服务器

使用一键部署脚本：

```bash
# 在本地执行
./deploy-to-server.sh
```

或手动使用 rsync：

```bash
rsync -avz --progress -e "ssh -p 22" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  ./ root@106.54.44.45:/root/ai-project-mgmt/
```

**预期输出示例**：
```
sending incremental file list
created directory /root/ai-project-mgmt
./
docker-compose.yml
         1,234 100%    0.00kB/s    0:00:00 (xfr#1, to-chk=4/8)
backend/
backend/.env
         567 100%    0.00kB/s    0:00:00 (xfr#2, to-chk=3/8)
...
sent 12.34K bytes  received 234 bytes  8.38K bytes/sec
total size is 45.67K  speedup is 3.62
```

### 2. 配置环境变量

在服务器上编辑环境变量文件：

```bash
# 进入项目目录
cd /root/ai-project-mgmt

# 编辑后端环境变量
nano backend/.env
```

**backend/.env 示例内容**：
```bash
# 应用配置
NODE_ENV=production
APP_PORT=3000

# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ai_project_mgmt
DB_USER=postgres
DB_PASSWORD=your_secure_password_here

# JWT 配置（生成强密钥）
JWT_ACCESS_SECRET=your_access_secret_at_least_32_chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=your_refresh_secret_at_least_32_chars
JWT_REFRESH_EXPIRES=7d

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

**生成安全的密钥**：
```bash
# 生成 JWT 密钥
openssl rand -base64 32

# 生成数据库密码
openssl rand -base64 16
```

### 3. 运行部署脚本

在服务器上执行：

```bash
cd /root/ai-project-mgmt

# 运行部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**预期输出示例**：
```
=== AI Project Management System Deployment ===
[INFO] Starting deployment...
[INFO] Creating necessary directories...
[INFO] Setting permissions...
[INFO] Building Docker images...
Building backend
Step 1/10 : FROM node:18-alpine
...
[INFO] Stopping existing containers...
[INFO] Starting services with Docker Compose...
Creating network "ai-project-mgmt_default" with the default driver
Creating db ... done
Creating redis ... done
Creating backend ... done
Creating frontend ... done
[INFO] Waiting for services to be ready...
[SUCCESS] Deployment completed successfully!
[INFO] Your application is now available at: http://106.54.44.45
```

### 4. 配置 Nginx 和 SSL

1. **安装 Certbot**：

```bash
# 安装 Certbot 和 Nginx 插件
apt install -y certbot python3-certbot-nginx

# 确保 Nginx 正在运行
systemctl start nginx
systemctl enable nginx
```

2. **配置 Nginx**：

```bash
# 创建 Nginx 配置文件
nano /etc/nginx/sites-available/ai-project-mgmt
```

**Nginx 配置内容**：
```nginx
server {
    server_name 106.54.44.45;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **启用配置**：

```bash
# 创建软链接
ln -s /etc/nginx/sites-available/ai-project-mgmt /etc/nginx/sites-enabled/

# 删除默认配置（可选）
rm /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

4. **获取 SSL 证书**：

使用 HTTP 方式（如果有域名）：

```bash
# 如果有域名，替换 106.54.44.45 为您的域名
certbot --nginx -d your-domain.com
```

使用自签名证书（仅用于 IP）：

```bash
# 创建证书目录
mkdir -p /etc/ssl/private

# 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ai-project-mgmt.key \
    -out /etc/ssl/certs/ai-project-mgmt.crt \
    -subj "/C=CN/ST=State/L=City/O=Organization/CN=106.54.44.45"

# 更新 Nginx 配置以使用 HTTPS
nano /etc/nginx/sites-available/ai-project-mgmt
```

**HTTPS Nginx 配置**：
```nginx
server {
    listen 80;
    server_name 106.54.44.45;
    return 301 https://$server_name$request_uri;
}

server {
    server_name 106.54.44.45;

    ssl_certificate /etc/ssl/certs/ai-project-mgmt.crt;
    ssl_certificate_key /etc/ssl/private/ai-project-mgmt.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 服务器操作脚本

见 `server-setup.sh` 文件内容，该脚本包含：

- 自动安装 Docker 和 Docker Compose
- 创建必要目录
- 设置权限
- 配置防火墙规则
- 安装其他必要工具（如 Nginx、Certbot）

---

## 一键部署脚本

见 `deploy-to-server.sh` 文件内容，该脚本包含：

- 使用 rsync 上传文件
- 远程执行部署命令
- 验证部署状态

---

## 常见错误处理

### 1. Docker 安装失败

**错误**：
```
E: Unable to locate package docker-ce
```

**解决方案**：
```bash
# 检查 Ubuntu 版本
lsb_release -cs

# 确保添加了正确的 Docker 仓库
# 如果使用的是其他发行版，请参考 Docker 官方文档
```

### 2. 端口被占用

**错误**：
```
Error starting userland proxy: listen tcp4 0.0.0.0:5432: bind: address already in use
```

**解决方案**：
```bash
# 查看占用端口的进程
lsof -i :5432

# 停止冲突的服务
systemctl stop postgresql

# 或者修改 docker-compose.yml 中的端口映射
```

### 3. 权限问题

**错误**：
```
permission denied while trying to connect to the Docker daemon socket
```

**解决方案**：
```bash
# 将用户添加到 docker 组
usermod -aG docker $USER

# 重新登录或使用
newgrp docker
```

### 4. 防火墙阻止访问

**错误**：
```
connection timeout
```

**解决方案**：
```bash
# 检查防火墙状态
ufw status

# 如果端口未开放
ufw allow 3000/tcp
ufw allow 8000/tcp

# 临时禁用防火墙测试
ufw disable
# 测试后重新启用
ufw enable
```

### 5. 数据库连接失败

**错误**：
```
could not connect to server: Connection refused
```

**解决方案**：
```bash
# 检查数据库容器是否运行
docker ps | grep db

# 查看数据库日志
docker logs ai-project-mgmt_db_1

# 在 docker-compose.yml 中检查环境变量配置
```

### 6. SSL 证书问题

**错误**：
```
nginx: [emerg] cannot load certificate
```

**解决方案**：
```bash
# 检查证书文件路径
ls -la /etc/ssl/certs/ai-project-mgmt.crt
ls -la /etc/ssl/private/ai-project-mgmt.key

# 确保权限正确
chmod 644 /etc/ssl/certs/ai-project-mgmt.crt
chmod 600 /etc/ssl/private/ai-project-mgmt.key
```

---

## 性能优化建议

### 1. 数据库优化

在 `backend/.env` 中添加：

```bash
# 数据库连接池
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# 查询超时
DATABASE_TIMEOUT=30000
```

在 `docker-compose.yml` 中配置 PostgreSQL：

```yaml
db:
  image: postgres:15
  environment:
    - POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
  command: >
    postgres
    -c max_connections=200
    -c shared_buffers=256MB
    -c effective_cache_size=1GB
    -c maintenance_work_mem=64MB
    -c checkpoint_completion_target=0.9
    -c wal_buffers=16MB
    -c default_statistics_target=100
    -c random_page_cost=1.1
    -c effective_io_concurrency=200
```

### 2. Redis 优化

在 `docker-compose.yml` 中配置 Redis：

```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
    --appendonly yes
```

### 3. Nginx 优化

在 `nginx.conf` 的 http 块中添加：

```nginx
# 启用 gzip 压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# 缓存配置
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m max_size=1g inactive=60m;

# 工作进程数
worker_processes auto;

# 连接数
events {
    worker_connections 1024;
}
```

### 4. 应用优化

- 启用生产模式缓存
- 使用 CDN 加速静态资源
- 定期清理 Docker 日志：
```bash
# 清理 Docker 日志
docker system prune -f
docker volume prune -f

# 或设置日志轮转
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' | sudo tee /etc/docker/daemon.json
systemctl restart docker
```

### 5. 监控设置

```bash
# 安装监控工具
docker run -d --name=cadvisor \
  -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:rw \
  -v /sys:/sys:ro \
  -v /var/lib/docker/:/var/lib/docker:ro \
  gcr.io/cadvisor/cadvisor

# 访问 http://106.54.44.45:8080 查看监控数据
```

---

## 部署后检查

1. **检查服务状态**：
```bash
docker-compose ps
```

2. **查看应用日志**：
```bash
# Frontend
docker-compose logs frontend

# Backend
docker-compose logs backend

# Database
docker-compose logs db
```

3. **测试 API 端点**：
```bash
curl http://106.54.44.45/api/v1
```

4. **检查网站访问**：
在浏览器中访问 `http://106.54.44.45` 或 `https://106.54.44.45`

---

## 备份策略

### 1. 数据库备份

创建备份脚本 `backup.sh`：

```bash
#!/bin/bash

BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker exec ai-project-mgmt_db_1 pg_dump -U postgres ai_project_mgmt > $BACKUP_DIR/db_backup_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/db_backup_$DATE.sql

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql.gz"
```

设置定时备份：

```bash
# 添加到 crontab
echo "0 2 * * * /root/ai-project-mgmt/backup.sh" | crontab -
```

### 2. 应用配置备份

```bash
# 备份配置文件
tar -czf app_config_$(date +%Y%m%d).tar.gz \
  backend/.env \
  docker-compose.yml \
  nginx.conf \
  scripts/
```

---

## 安全建议

1. **定期更新**：
```bash
# 更新系统
apt update && apt upgrade -y

# 更新 Docker 镜像
docker-compose pull
docker-compose up -d
```

2. **使用强密码**：
- 数据库密码至少 16 位
- JWT 密钥至少 32 位
- 定期更换密码

3. **限制 SSH 访问**：
```bash
# 编辑 SSH 配置
nano /etc/ssh/sshd_config

# 修改以下选项
PermitRootLogin no
PasswordAuthentication no
AllowUsers deploy

# 重启 SSH 服务
systemctl restart ssh
```

4. **配置 fail2ban**：
```bash
# 安装 fail2ban
apt install -y fail2ban

# 配置
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# 启动服务
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 故障排查命令

```bash
# 查看系统资源使用
htop
df -h
free -h

# 查看网络连接
netstat -tulpn
ss -tulpn

# 查看 Docker 资源使用
docker stats

# 查看磁盘 I/O
iotop

# 查看系统日志
journalctl -xe
tail -f /var/log/syslog

# 查看 Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 联系支持

如果遇到问题，请提供以下信息：
1. 服务器规格（CPU、内存、磁盘）
2. 操作系统版本：`cat /etc/os-release`
3. Docker 版本：`docker --version`
4. 错误日志：`docker-compose logs`
5. 创建的 GitHub Issue

---

## 版本历史

- **v1.0.0** - 初始部署指南
- 基于最新的技术栈：Docker、PostgreSQL、Redis、React、NestJS、Node.js

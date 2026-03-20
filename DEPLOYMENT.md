# AI 项目管理系统 - 生产环境部署指南

本指南介绍如何使用 Docker 和 Docker Compose 将 AI 项目管理系统部署到生产环境。

## 前置条件

- 已安装 Docker 和 Docker Compose
- HTTPS 所需的 SSL 证书
- 生产环境变量配置
- Git 用于克隆仓库

## 快速开始

1. **克隆并准备仓库**
   ```bash
   git clone <repository-url>
   cd ai-project-mgmt
   chmod +x deploy.sh
   ```

2. **设置环境变量**
   ```bash
   cp .env.prod.example .env.prod
   # 编辑 .env.prod 文件，填入实际配置值
   ```

3. **添加 SSL 证书**
   ```bash
   mkdir -p nginx/ssl
   # 将证书复制到 nginx/ssl/cert.pem 和 nginx/ssl/key.pem
   ```

4. **部署**
   ```bash
   ./deploy.sh
   ```

## 部署脚本选项

`deploy.sh` 脚本支持以下选项：

- `--backup-db`: 部署前创建数据库备份
- `--skip-build`: 跳过构建过程，仅重新部署现有镜像
- `--env FILE`: 使用指定的环境文件（默认：.env.prod）
- `--help`: 显示所有可用选项

示例：
```bash
# 带数据库备份的部署
./deploy.sh --backup-db

# 重新部署但不重新构建
./deploy.sh --skip-build

# 使用自定义环境文件
./deploy.sh --env .env.staging
```

## 架构

生产环境部署包含以下组件：

- **Nginx**: 反向代理和 SSL 终止
- **Frontend**: 由 Nginx 提供服务的 React 生产构建
- **Backend**: NestJS API 服务器
- **PostgreSQL**: 主数据库
- **Redis**: 缓存和会话存储
- **Worker**: 后台任务处理器

## SSL/TLS 配置

### 生产环境 SSL 证书

1. 从您的证书颁发机构获取证书
2. 将证书放置在 `nginx/ssl/` 目录：
   - `cert.pem`: 证书文件
   - `key.pem`: 私钥文件

### 自签名证书（仅开发环境）

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

## 环境变量

`.env.prod` 中的关键环境变量：

- `DB_*`: PostgreSQL 连接设置
- `REDIS_*`: Redis 连接设置
- `JWT_ACCESS_*` / `JWT_REFRESH_*`: JWT 令牌配置
- `ANTHROPIC_API_KEY`: AI 功能的 API 密钥
- `APP_PORT`: 后端服务端口（生产建议 3000）

## 数据库管理

### 备份数据库

部署期间自动备份：
```bash
./deploy.sh --backup-db
```

手动备份：
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U your_username -d ai_project_mgmt_prod > backup.sql
```

### 从备份恢复

```bash
# 停止应用程序
docker-compose -f docker-compose.prod.yml stop backend backend-worker

# 从备份恢复
docker-compose -f docker-compose.prod.yml exec -T postgres psql \
  -U your_username -d ai_project_mgmt_prod < backup.sql

# 重启服务
docker-compose -f docker-compose.prod.yml start backend backend-worker
```

## 监控和日志

### 查看日志

```bash
# 所有服务
docker-compose -f docker-compose.prod.yml logs -f

# 特定服务
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 健康检查

```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 手动健康检查
curl -k https://localhost/health      # 前端
curl -k https://localhost/api/v1       # 后端
```

## 扩展

### 水平扩展

要运行后端的多个实例：

```yaml
# 在 docker-compose.prod.yml 中
backend:
  # ... 现有配置 ...
  deploy:
    replicas: 3
```

### 资源限制

在 `docker-compose.prod.yml` 中添加资源约束：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## 安全建议

1. **定期更新**: 保持 Docker 镜像更新
2. **密钥管理**: 在生产环境中使用适当的密钥管理
3. **网络安全**: 配置防火墙规则
4. **备份**: 定期自动备份
5. **监控**: 设置监控和警报
6. **SSL 证书**: 使用受信任 CA 的证书
7. **环境安全**: 保护环境变量

## 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口 80/443 的使用情况
   sudo lsof -i :80
   sudo lsof -i :443
   ```

2. **权限错误**
   ```bash
   # 修复文件权限
   sudo chown -R $USER:$USER .
   chmod +x deploy.sh
   ```

3. **数据库连接问题**
   ```bash
   # 检查数据库日志
   docker-compose -f docker-compose.prod.yml logs postgres

   # 验证连接
   docker-compose -f docker-compose.prod.yml exec backend ping postgres
   ```

4. **SSL 证书错误**
   ```bash
   # 验证证书
   openssl x509 -in nginx/ssl/cert.pem -text -noout
   ```

### 清理

```bash
# 删除所有容器和卷（危险 - 会清除数据！）
docker-compose -f docker-compose.prod.yml down -v

# 删除未使用的镜像
docker image prune -a

# 删除未使用的卷
docker volume prune
```

## 维护

### 定期任务

1. **每周**: 检查安全更新
2. **每月**: 更新 Docker 镜像并重新部署
3. **每季度**: 审查和轮换密钥
4. **每年**: SSL 证书续期

### 更新流程

```bash
# 拉取最新代码
git pull origin main

# 带备份的更新
./deploy.sh --backup-db

# 或无停机更新（如果没有数据库变更）
./deploy.sh --skip-build
```

## 支持

如需部署问题支持：

1. 检查日志：`docker-compose logs`
2. 验证环境变量
3. 检查资源使用：`docker stats`
4. 查看本指南和故障排除部分

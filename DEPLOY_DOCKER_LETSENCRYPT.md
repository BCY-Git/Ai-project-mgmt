# Docker 生产部署清单（Nginx + Let's Encrypt）

这份清单用于你在服务器上手动实操部署本项目。

## 1. 前置条件

- 一台公网 Linux 服务器（推荐 Ubuntu 22.04+）
- 域名已解析到服务器公网 IP（至少 1 条 A 记录）
- 80/443 端口已放行（云安全组 + 系统防火墙）
- 已安装：
  - Docker
  - Docker Compose 插件（`docker compose version`）
  - Git

## 2. 拉取代码

```bash
git clone git@github.com:BCY-Git/Ai-project-mgmt.git
cd Ai-project-mgmt
git checkout main
```

## 3. 配置 `.env`

```bash
cp .env.example .env
vim .env
```

生产最关键字段（请按实际改）：

- `NODE_ENV=development`（当前仓库依赖 TypeORM synchronize 自动建表）
- `APP_PORT=3000`
- `DB_HOST=postgres`
- `DB_PORT=5432`
- `DB_NAME=ai_project_mgmt`
- `DB_USER=postgres`
- `DB_PASSWORD=强密码`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`
- `REDIS_PASSWORD=强密码`
- `JWT_ACCESS_SECRET=随机长串`
- `JWT_REFRESH_SECRET=随机长串`
- `ANTHROPIC_API_KEY=你的Key`

## 4. 配置前端生产环境

创建文件 `frontend/.env.production`：

```env
VITE_API_BASE_URL=/api/v1
VITE_WS_URL=
```

> 前端将走同域名反向代理，不要写 `localhost`。

## 5. 配置 Nginx 域名

编辑文件 `nginx/production/conf.d/app.conf`，替换：

- `YOUR_DOMAIN` -> 你的主域名（例如 `app.example.com`）
- `YOUR_WWW_DOMAIN` -> 你的第二域名（例如 `www.example.com`），如果不用可删除

并确认：

- `ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;`
- `ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;`

中的 `YOUR_DOMAIN` 与主域名一致。

## 6. 首次签发证书

运行脚本（会先拉起 app 容器，再用 standalone 模式签发）：

```bash
./scripts/issue-letsencrypt-cert.sh you@example.com app.example.com www.example.com
```

如果你只有一个域名：

```bash
./scripts/issue-letsencrypt-cert.sh you@example.com app.example.com
```

## 7. 启动完整栈

```bash
docker compose -f docker-compose.https.yml up -d --build
docker compose -f docker-compose.https.yml ps
```

查看日志：

```bash
docker compose -f docker-compose.https.yml logs -f nginx backend frontend certbot
```

## 8. 验证

- 打开：`https://你的域名`
- API 连通性：

```bash
curl -I https://你的域名/api/v1
```

- Socket.IO（通信模块）通过同域 `/socket.io/` 反代，无需额外端口。

## 9. 运维常用命令

重启：

```bash
docker compose -f docker-compose.https.yml restart
```

停止：

```bash
docker compose -f docker-compose.https.yml down
```

更新部署：

```bash
git pull
docker compose -f docker-compose.https.yml up -d --build
```

## 10. 常见问题

- **证书签发失败**
  - 检查域名解析是否生效
  - 检查 80 端口是否被占用
  - 检查安全组/防火墙
- **页面可开但接口 502**
  - 看 `backend` 日志是否启动异常
  - `.env` 的 `DB_HOST/REDIS_HOST` 必须是容器名 `postgres/redis`
- **聊天连不上**
  - 确认 Nginx 里 `/socket.io/` 反代到 `backend:3000`


# AI 项目智能拆解系统

企业项目智能管理平台，通过 AI 一键将项目描述拆解为结构化任务，自动分配给团队成员。

## 快速开始

### 开发环境

1. 复制环境变量文件
```bash
cp .env.example .env
# 编辑 .env 文件，填入实际配置
```

2. 启动数据库和 Redis
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres redis -d
```

3. 安装依赖
```bash
# 后端
cd backend
pnpm install

# 前端
cd ../frontend
pnpm install
```

4. 启动开发服务器
```bash
# 后端
cd backend
pnpm run start:dev

# 前端（新终端）
cd frontend
pnpm run dev
```

## 技术栈

- 后端：NestJS, TypeScript, TypeORM, PostgreSQL, Redis
- 前端：React, TypeScript, Vite, React Router, shadcn/ui, Tailwind CSS
- AI：Anthropic Claude API
- 基础设施：Docker, Docker Compose, Nginx

## 开发文档

详见 `AI项目管理系统-开发蓝图.md`

## 开发阶段

- [x] Phase 1: 基础骨架搭建
- [ ] Phase 2: 核心 CRUD 功能
- [ ] Phase 3: AI 核心功能
- [ ] Phase 4: 完善与上线

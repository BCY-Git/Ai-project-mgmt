#!/bin/bash

# AI 项目管理系统部署脚本
# 此脚本处理应用程序的构建和生产部署

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
BACKUP_DB=false
SKIP_BUILD=false
ENV_FILE=".env.prod"
COMPOSE_CMD=""

compose() {
    ${COMPOSE_CMD} -f docker-compose.prod.yml "$@"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backup-db)
            BACKUP_DB=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --env)
            ENV_FILE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --backup-db    Backup the database before deployment"
            echo "  --skip-build   Skip the build process and just redeploy"
            echo "  --env FILE     Use specific environment file (default: .env.prod)"
            echo "  -h, --help     Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found!"
    print_error "Please create it with the necessary variables."
    exit 1
fi

# 从环境文件加载环境变量
print_status "正在从 $ENV_FILE 加载环境变量"
export $(grep -v '^#' "$ENV_FILE" | xargs)

# 备份数据库的函数
backup_database() {
    if [ "$BACKUP_DB" = true ]; then
        print_status "正在创建数据库备份..."

        BACKUP_DIR="database/backups"
        BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

        # Create backup directory if it doesn't exist
        mkdir -p "$BACKUP_DIR"

        # Run backup
        compose exec -T postgres pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            > "$BACKUP_FILE"

        print_status "数据库备份已创建: $BACKUP_FILE"

        # Compress backup
        gzip "$BACKUP_FILE"
        print_status "备份已压缩: ${BACKUP_FILE}.gz"
    fi
}

# 构建和部署的函数
build_and_deploy() {
    print_status "正在开始部署流程..."

    # 停止现有服务
    print_status "正在停止现有服务..."
    compose down

    if [ "$SKIP_BUILD" = false ]; then
        # 构建新镜像
        print_status "正在构建 Docker 镜像..."
        compose build --no-cache

        # 清理旧镜像
        print_status "正在清理旧的 Docker 镜像..."
        docker image prune -f
    else
        print_warning "根据请求跳过构建过程"
    fi

    # 启动服务
    print_status "正在启动服务..."
    compose up -d

    # 等待服务健康
    print_status "正在等待服务健康..."
    sleep 10

    # Check service health
    for service in backend postgres redis; do
        print_status "Checking $service health..."
        if compose ps "$service" | grep -q "Up (healthy)"; then
            print_status "$service 健康状态良好"
        else
            print_warning "$service 可能尚未完全就绪"
        fi
    done

    # 运行数据库迁移（如需要）
    print_status "正在运行数据库迁移..."
    compose exec -T backend npm run migration:run || true
}

# 验证部署的函数
verify_deployment() {
    print_status "正在验证部署..."

    # 检查 Nginx（静态页 + SSL；无独立 frontend 容器）
    sleep 5
    if compose exec -T backend curl -k -f -s "https://nginx/health" > /dev/null; then
        print_status "Nginx 健康检查通过"
    else
        print_error "Nginx 健康检查失败（请确认 nginx/ssl 证书与 frontend/dist 已就绪）"
        return 1
    fi

    # 检查后端 API（容器内）
    if compose exec -T backend curl -f -s http://localhost:3000/api/v1 > /dev/null; then
        print_status "后端 API 正在响应"
    else
        print_error "后端 API 健康检查失败"
        return 1
    fi

    print_status "部署验证成功完成！"
}

# 主要执行函数
main() {
    print_status "AI 项目管理系统部署"
    print_status "====================================="

    # 检查 Docker 和 Docker Compose
    if ! command -v docker &> /dev/null; then
        print_error "未安装 Docker！"
        exit 1
    fi

    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        print_error "未安装 Docker Compose（docker-compose 或 docker compose）！"
        exit 1
    fi

    # 创建 SSL 目录（如果不存在）
    mkdir -p nginx/ssl

    # 检查 SSL 证书是否存在
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        print_warning "在 nginx/ssl/ 中未找到 SSL 证书"
        print_warning "请在生产环境运行前添加 SSL 证书"
        print_status "开发环境可生成自签名证书："
        echo "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
        echo "    -keyout nginx/ssl/key.pem \\"
        echo "    -out nginx/ssl/cert.pem"
        echo ""
        read -p "Continue without SSL? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # 创建必要目录
    mkdir -p logs/nginx logs/backend logs/worker uploads database/backups

    # 备份数据库（如请求）
    backup_database

    # 构建和部署
    build_and_deploy

    # 验证部署
    if verify_deployment; then
        print_status "🎉 部署成功完成！"
        print_status ""
        print_status "服务运行地址："
        print_status "  Frontend: https://localhost"
        print_status "  Backend API: https://localhost/api/v1"
        print_status ""
        print_status "查看日志：${COMPOSE_CMD} -f docker-compose.prod.yml logs -f [service]"
        print_status "停止服务：${COMPOSE_CMD} -f docker-compose.prod.yml down"
    else
        print_error "部署验证失败！"
        print_error "使用以下命令检查日志：${COMPOSE_CMD} -f docker-compose.prod.yml logs"
        exit 1
    fi
}

# 错误处理
trap 'print_error "部署在第 $LINENO 行失败"' ERR

# 运行主函数
main "$@"

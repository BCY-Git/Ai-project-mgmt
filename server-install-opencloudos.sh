#!/bin/bash
# 服务器端一键安装脚本 - OpenCloudOS版本
# 在服务器上执行这个脚本

set -e

echo "=== AI项目管理系统 - 服务器安装 (OpenCloudOS) ==="
echo ""

# 检查是否是root用户
if [ "$EUID" -ne 0 ]; then
   echo "请使用root用户运行此脚本"
   exit 1
fi

# 更新系统
echo "1. 更新系统..."
dnf update -y
# 或者使用 yum
# yum update -y

# 安装必要工具
echo "2. 安装必要工具..."
dnf install -y curl wget unzip git tar which

# 安装Docker
echo "3. 安装Docker..."
if ! command -v docker &> /dev/null; then
    # 添加Docker仓库
    dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
    dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # 启动Docker
    systemctl enable docker
    systemctl start docker
    echo "Docker安装完成"
else
    echo "Docker已安装"
fi

# 检查Docker Compose（现在通常随着docker-compose-plugin安装）
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "4. 安装Docker Compose..."
    # 下载Docker Compose独立版本
    curl -L "https://github.com/docker/compose/releases/v2.21.0/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose安装完成"
else
    echo "4. Docker Compose已安装"
fi

# 安装openssl（用于生成密码）
echo "5. 安装openssl..."
dnf install -y openssl openssl-devel

# 创建项目目录
echo "6. 创建项目目录..."
mkdir -p /root/ai-project-mgmt
cd /root/ai-project-mgmt

# 检查是否已有项目文件
if [ -f "/root/project.tar.gz" ]; then
    echo "7. 解压项目文件..."
    tar -xzf /root/project.tar.gz -C /root/ai-project-mgmt
    rm -f /root/project.tar.gz
    echo "项目解压完成"
else
    echo "7. 等待项目文件上传..."
    echo "请在本地执行以下命令上传项目文件："
    echo "scp -P 22 ~/Desktop/project.tar.gz root@106.54.44.45:/root/"
    echo ""
    read -p "文件上传完成后按回车继续..."

    if [ -f "/root/project.tar.gz" ]; then
        tar -xzf /root/project.tar.gz -C /root/ai-project-mgmt
        rm -f /root/project.tar.gz
    else
        echo "错误：找不到项目文件 /root/project.tar.gz"
        exit 1
    fi
fi

# 配置环境
echo "8. 配置环境..."
if [ ! -f "backend/.env" ]; then
    cp .env.prod.example backend/.env

    # 生成随机密码
    DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64)
    JWT_REFRESH_SECRET=$(openssl rand -base64 64)

    # 更新配置
    sed -i "s/your_strong_password_here/$DB_PASS/g" backend/.env
    sed -i "s/your_redis_password_here/$REDIS_PASS/g" backend/.env
    sed -i "s/your_jwt_secret_key_here/$JWT_SECRET/g" backend/.env
    sed -i "s/your_jwt_refresh_secret_key_here/$JWT_REFRESH_SECRET/g" backend/.env
    sed -i "s|CORS_ORIGIN=http://localhost:5173|CORS_ORIGIN=http://106.54.44.45|g" backend/.env

    echo "环境配置完成！"
else
    echo "环境配置已存在"
fi

# 停止可能运行的容器
echo "9. 停止现有服务..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 构建和启动
echo "10. 构建并启动服务..."
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "11. 等待服务启动..."
sleep 30

# 检查状态
echo "12. 检查服务状态..."
docker-compose -f docker-compose.prod.yml ps

# 检查端口
echo "13. 检查端口状态..."
netstat -tlnp 2>/dev/null | grep -E ':(80|443|3001)' || ss -tlnp | grep -E ':(80|443|3001)' || echo "端口检查完成"

# 清理
rm -f /root/server-install-opencloudos.sh

echo ""
echo "=== 安装完成 ==="
echo ""
echo "访问地址: http://106.54.44.45"
echo ""
echo "默认管理员账号:"
echo "  邮箱: admin@example.com"
echo "  密码: admin123"
echo ""
echo "常用命令:"
echo "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "  重启服务: docker-compose -f docker-compose.prod.yml restart"
echo "  查看状态: docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "如果服务无法访问，请检查防火墙设置："
echo "  查看防火墙: firewall-cmd --list-all"
echo "  开放端口: firewall-cmd --permanent --add-port=80/tcp"
echo "            firewall-cmd --permanent --add-port=443/tcp"
echo "  重新加载: firewall-cmd --reload"
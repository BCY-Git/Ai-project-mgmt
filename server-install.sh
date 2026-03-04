#!/bin/bash
# 服务器端一键安装脚本
# 在服务器上执行这个脚本

set -e

echo "=== AI项目管理系统 - 服务器安装 ==="
echo ""

# 检查是否是root用户
if [ "$EUID" -ne 0 ]; then
   echo "请使用root用户运行此脚本"
   exit 1
fi

# 更新系统
echo "1. 更新系统..."
apt-get update

# 安装必要工具
echo "2. 安装必要工具..."
apt-get install -y curl wget unzip git tar

# 安装Docker
echo "3. 安装Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
else
    echo "Docker已安装"
fi

# 安装Docker Compose
echo "4. 安装Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/v2.21.0/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose已安装"
fi

# 创建项目目录
echo "5. 创建项目目录..."
mkdir -p /root/ai-project-mgmt
cd /root/ai-project-mgmt

# 等待上传文件
echo ""
echo "6. 等待项目文件上传..."
echo "请在本地执行以下命令上传项目文件："
echo "scp -P 22 /path/to/project.tar.gz root@106.54.44.45:/root/"
echo ""
read -p "文件上传完成后按回车继续..."

# 解压项目
echo "7. 解压项目文件..."
if [ -f "/root/project.tar.gz" ]; then
    tar -xzf /root/project.tar.gz -C /root/ai-project-mgmt
    rm /root/project.tar.gz
    echo "项目解压完成"
else
    echo "错误：找不到项目文件 /root/project.tar.gz"
    exit 1
fi

# 配置环境
echo "8. 配置环境..."
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

# 构建和启动
echo "9. 构建并启动服务..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "10. 等待服务启动..."
sleep 30

# 检查状态
echo "11. 检查服务状态..."
docker-compose -f docker-compose.prod.yml ps

# 清理
rm -f server-install.sh

echo ""
echo "=== 安装完成 ==="
echo ""
echo "访问地址: http://106.54.44.45"
echo ""
echo "默认管理员账号:"
echo "  邮箱: admin@example.com"
echo "  密码: admin123"
echo ""
echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "重启服务: docker-compose -f docker-compose.prod.yml restart"
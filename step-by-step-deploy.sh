#!/bin/bash

# 分步部署脚本
SERVER_IP="106.54.44.45"
SERVER_PASS="qwsdcv123!@#"
SERVER_PORT="22"
PROJECT_DIR="/root/ai-project-mgmt"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== AI项目管理系统 - 部署助手 ===${NC}"
echo ""

# 创建一个expect脚本
cat > /tmp/remote.exp << 'EOF'
#!/usr/bin/expect
set timeout 60
set ip [lindex $argv 0]
set port [lindex $argv 1]
set pass [lindex $argv 2]
set cmd [lindex $argv 3]

spawn ssh -p $port root@$ip $cmd
expect {
    -re "password:\s*$" {
        send "$pass\r"
        expect eof
    }
    -re "Password:\s*$" {
        send "$pass\r"
        expect eof
    }
    -re "Are you sure.*?\s*\[yes/no\]\s*$" {
        send "yes\r"
        exp_continue
    }
    eof
}
EOF

chmod +x /tmp/remote.exp

# 函数：远程执行命令
remote_cmd() {
    /tmp/remote.exp $SERVER_IP $SERVER_PORT $SERVER_PASS "$1"
}

# 步骤1：准备服务器
echo -e "${YELLOW}步骤1: 准备服务器环境${NC}"
echo "安装必要的工具并创建目录..."

remote_cmd "apt-get update && apt-get install -y curl wget tar"

# 步骤2：安装Docker（如果需要）
echo -e "${YELLOW}步骤2: 检查Docker安装状态${NC}"
DOCKER_STATUS=$(remote_cmd "command -v docker || echo 'not installed'")

if [[ "$DOCKER_STATUS" == *"not installed"* ]]; then
    echo -e "${BLUE}Docker未安装，正在安装...${NC}"
    remote_cmd "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && systemctl enable docker && systemctl start docker"

    echo -e "${BLUE}安装Docker Compose...${NC}"
    remote_cmd "curl -L 'https://github.com/docker/compose/releases/v2.21.0/download/docker-compose-$(uname -s)-$(uname -m)' -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose"
else
    echo -e "${GREEN}✓ Docker已安装${NC}"
fi

# 步骤3：创建项目目录
echo -e "${YELLOW}步骤3: 创建项目目录${NC}"
remote_cmd "mkdir -p $PROJECT_DIR"

# 步骤4：生成上传用的文件列表
echo -e "${YELLOW}步骤4: 准备项目文件${NC}"
cd /Users/martin/ai-project-mgmt

# 创建一个包含所有必要文件的临时目录
TEMP_DIR="/tmp/ai-project-deploy-$(date +%s)"
mkdir -p "$TEMP_DIR"

# 复制必要文件
echo "复制项目文件..."
rsync -av --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='target' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='ai-project-mgmt/frontend/node_modules' \
    --exclude='ai-project-mgmt/backend/node_modules' \
    "$TEMP_DIR/" 2>/dev/null || ditto -rsrc --exclude node_modules --exclude .git --exclude dist --exclude target . "$TEMP_DIR/"

# 创建压缩包
cd "$TEMP_DIR"
tar -czf /tmp/project-files.tar.gz .
cd - > /dev/null

# 步骤5：上传文件
echo -e "${YELLOW}步骤5: 上传项目文件到服务器${NC}"
scp -P $SERVER_PORT /tmp/project-files.tar.gz root@$SERVER_IP:/tmp/

# 在服务器解压
remote_cmd "cd $PROJECT_DIR && tar -xzf /tmp/project-files.tar.gz && ls -la"

# 清理临时文件
rm -rf "$TEMP_DIR" /tmp/project-files.tar.gz

# 步骤6：配置环境
echo -e "${YELLOW}步骤6: 配置环境变量${NC}"
remote_cmd "cd $PROJECT_DIR && cp .env.prod.example backend/.env"

# 生成随机密码并替换
ENV_SCRIPT='#!/bin/bash
cd /root/ai-project-mgmt/backend

# 生成随机密码
DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# 更新.env文件
sed -i "s/your_strong_password_here/$DB_PASS/g" .env
sed -i "s/your_redis_password_here/$REDIS_PASS/g" .env

# 生成JWT密钥
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

sed -i "s/your_jwt_secret_key_here/$JWT_SECRET/g" .env
sed -i "s/your_jwt_refresh_secret_key_here/$JWT_REFRESH_SECRET/g" .env

# 更新CORS
sed -i "s|CORS_ORIGIN=http://localhost:5173|CORS_ORIGIN=http://106.54.44.45|g" .env

# 更新MySQL配置为PostgreSQL
sed -i "s/DB_TYPE=mysql/DB_TYPE=postgres/g" .env

echo "环境配置完成！"
'
echo "$ENV_SCRIPT" > /tmp/config-env.sh
scp -P $SERVER_PORT /tmp/config-env.sh root@$SERVER_IP:/tmp/
remote_cmd "chmod +x /tmp/config-env.sh && /tmp/config-env.sh"

# 步骤7：启动服务
echo -e "${YELLOW}步骤7: 启动Docker服务${NC}"
remote_cmd "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml up -d"

# 等待服务启动
echo -e "${YELLOW}步骤8: 等待服务启动（30秒）...${NC}"
sleep 30

# 步骤9：检查服务状态
echo -e "${YELLOW}步骤9: 检查服务状态${NC}"
remote_cmd "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml ps"

# 步骤10：检查端口
echo -e "${YELLOW}步骤10: 检查端口状态${NC}"
remote_cmd "netstat -tlnp | grep -E ':(80|443|3001)' || ss -tlnp | grep -E ':(80|443|3001)'"

# 清理临时文件
rm -f /tmp/remote.exp /tmp/config-env.sh

echo ""
echo -e "${GREEN}=== 部署完成！ ===${NC}"
echo ""
echo -e "${BLUE}访问地址：${NC}"
echo "  http://106.54.44.45"
echo "  https://106.54.44.45 （如果配置了SSL）"
echo ""
echo -e "${BLUE}默认管理员账号：${NC}"
echo "  邮箱: admin@example.com"
echo "  密码: admin123"
echo ""
echo -e "${YELLOW}注意：${NC}"
echo "1. 首次部署可能需要等待几分钟服务完全启动"
echo "2. 如果无法访问，请检查服务器防火墙设置"
echo "3. 建议修改默认密码"
echo ""
echo -e "${BLUE}常用命令：${NC}"
echo "查看日志: ssh root@106.54.44.45 'cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml logs -f'"
echo "重启服务: ssh root@106.54.44.45 'cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml restart'"
echo "查看状态: ssh root@106.54.44.45 'cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml ps'"
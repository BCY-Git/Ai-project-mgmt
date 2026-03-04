#!/bin/bash

# 简化的部署脚本 - 使用expect处理密码
SERVER_IP="106.54.44.45"
SERVER_USER="root"
SERVER_PASS="qwsdcv123!@#"
SERVER_PORT="22"
PROJECT_DIR="/root/ai-project-mgmt"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== AI项目管理系统 - 服务器部署 ===${NC}"
echo "服务器IP: $SERVER_IP"
echo "部署路径: $PROJECT_DIR"
echo ""

# 检查是否有expect
if ! command -v expect &> /dev/null; then
    echo -e "${RED}错误: 需要安装expect工具${NC}"
    echo "macOS安装: brew install expect"
    echo "Ubuntu安装: apt-get install expect"
    exit 1
fi

# 创建expect脚本用于SSH连接
cat > /tmp/ssh_cmd.exp << 'EOF'
#!/usr/bin/expect
set timeout 30
set server_ip [lindex $argv 0]
set server_pass [lindex $argv 1]
set server_port [lindex $argv 2]
set command [lindex $argv 3]

spawn ssh -p $server_port root@$server_ip $command
expect {
    "password:" {
        send "$server_pass\r"
        expect eof
    }
    "Password:" {
        send "$server_pass\r"
        expect eof
    }
    "Are you sure you want to continue connecting (yes/no)?" {
        send "yes\r"
        expect "password:" {
            send "$server_pass\r"
            expect eof
        }
        expect "Password:" {
            send "$server_pass\r"
            expect eof
        }
    }
    eof
}
EOF

chmod +x /tmp/ssh_cmd.exp

# 测试SSH连接
echo -e "${YELLOW}1. 测试SSH连接...${NC}"
if /tmp/ssh_cmd.exp $SERVER_IP $SERVER_PASS $SERVER_PORT "echo 'SSH连接成功！'"; then
    echo -e "${GREEN}✓ SSH连接测试成功${NC}"
else
    echo -e "${RED}✗ SSH连接失败${NC}"
    echo "请检查服务器IP、端口和密码"
    exit 1
fi

# 创建项目目录
echo -e "${YELLOW}2. 创建项目目录...${NC}"
/tmp/ssh_cmd.exp $SERVER_IP $SERVER_PASS $SERVER_PORT "mkdir -p $PROJECT_DIR"

# 同步文件
echo -e "${YELLOW}3. 上传项目文件（这可能需要几分钟）...${NC}"
if command -v rsync &> /dev/null; then
    # 使用rsync（需要sshpass，但这儿先用tar试试）
    echo "使用tar打包上传..."

    # 在本地创建打包的文件
    tar -czf /tmp/project.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='target' \
        --exclude='.DS_Store' \
        --exclude='*.log' \
        --exclude='ai-project-mgmt/frontend/node_modules' \
        --exclude='ai-project-mgmt/backend/node_modules' \
        .

    # 上传tar文件
    scp -P $SERVER_PORT /tmp/project.tar.gz root@$SERVER_IP:/tmp/

    # 在服务器上解压
    /tmp/ssh_cmd.exp $SERVER_IP $SERVER_PASS $SERVER_PORT "cd $PROJECT_DIR && tar -xzf /tmp/project.tar.gz && rm /tmp/project.tar.gz"

    # 清理
    rm /tmp/project.tar.gz
else
    echo -e "${RED}错误: 需要tar和scp命令${NC}"
    exit 1
fi

# 安装Docker
echo -e "${YELLOW}4. 检查并安装Docker...${NC}"
DOCKER_CHECK=$(/tmp/ssh_cmd.exp $SERVER_IP $SERVER_PASS $SERVER_PORT "command -v docker")
if [[ -z "$DOCKER_CHECK" ]]; then
    echo "Docker未安装，正在安装..."

    # 创建安装脚本
    cat > /tmp/install_docker.sh << 'EOF'
#!/bin/bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# 安装Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
rm get-docker.sh
EOF

    # 上传并执行安装脚本
    scp -P $SERVER_PORT /tmp/install_docker.sh root@$SERVER_IP:/tmp/
    /tmp/ssh_cmd.exp $SERVER_IP $SERVER_PASS $SERVER_PORT "chmod +x /tmp/install_docker.sh && /tmp/install_docker.sh"

    # 等待Docker启动
    echo "等待Docker启动..."
    sleep 10
fi

# 部署应用
echo -e "${YELLOW}5. 部署应用...${NC}"
/tmp/ssh_cmd.exp $SERVER_IP $SERVER_PASS $SERVER_PORT "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml down || true"

# 配置环境
echo -e "${YELLOW}6. 配置环境变量...${NC}"
cat > /tmp/setup_env.sh << 'EOF'
#!/bin/bash
cd /root/ai-project-mgmt

# 生成随机密码
DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# 创建环境配置
cat > backend/.env << EOL
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=$DB_PASS
DB_NAME=ai_project_mgmt

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASS

# JWT配置
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# API配置
API_HOST=0.0.0.0
API_PORT=3001

# 生产环境
NODE_ENV=production

# CORS配置
CORS_ORIGIN=http://106.54.44.45

# 上传配置
UPLOAD_MAX_SIZE=10485760
EOL

echo "环境配置已保存"
EOF

scp -P $SERVER_PORT /tmp/setup_env.sh root@$SERVER_IP:/tmp/
/tmp/ssh_cmd.exp $SERVER_IP $SERVER_PASS $SERVER_PORT "chmod +x /tmp/setup_env.sh && /tmp/setup_env.sh"

# 启动服务
echo -e "${YELLOW}7. 启动所有服务...${NC}"
/tmp/ssh_cmd.exp $SERVER_IP $SERVER_PASS $SERVER_PORT "cd $PROJECT_DIR && chmod +x scripts/deploy.sh && ./scripts/deploy.sh"

# 等待服务启动
echo -e "${YELLOW}8. 等待服务启动...${NC}"
sleep 30

# 检查服务状态
echo -e "${YELLOW}9. 检查服务状态...${NC}"
/tmp/ssh_cmd.exp $SERVER_IP $SERVER_PASS $SERVER_PORT "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml ps"

# 清理临时文件
rm -f /tmp/ssh_cmd.exp /tmp/install_docker.sh /tmp/setup_env.sh

echo -e "${GREEN}=== 部署完成 ===${NC}"
echo "访问地址: http://106.54.44.45"
echo "如果有防火墙，请确保开放80和443端口"
echo ""
echo "常用命令："
echo "查看日志: ssh root@$SERVER_IP 'cd $PROJECT_DIR && docker-compose logs -f'"
echo "重启服务: ssh root@$SERVER_IP 'cd $PROJECT_DIR && docker-compose restart'"
echo "查看状态: ssh root@$SERVER_IP 'cd $PROJECT_DIR && docker-compose ps'"
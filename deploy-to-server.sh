#!/bin/bash

# AI Project Management System - Deploy to Server Script
# This script uploads files to the server and triggers deployment

set -e  # Exit on any error

# Server configuration
SERVER_IP="106.54.44.45"
SERVER_PORT="22"
SERVER_USER="root"
SERVER_PATH="/root/ai-project-mgmt"

# Local project path
PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Check if rsync is installed
if ! command -v rsync &> /dev/null; then
    print_error "rsync is not installed. Please install it first:"
    echo "  - Ubuntu/Debian: sudo apt-get install rsync"
    echo "  - macOS: brew install rsync"
    exit 1
fi

# Check SSH connection
print_status "Checking SSH connection to server..."
if ! ssh -p ${SERVER_PORT} -o ConnectTimeout=10 -o BatchMode=yes ${SERVER_USER}@${SERVER_IP} "echo 'Connection successful'" 2>/dev/null; then
    print_error "Cannot connect to server via SSH"
    echo ""
    echo "Please ensure:"
    echo "1. Server IP (${SERVER_IP}) is correct"
    echo "2. SSH port (${SERVER_PORT}) is open"
    echo "3. SSH keys are configured or you have password authentication"
    echo ""
    echo "Test connection manually:"
    echo "  ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP}"
    exit 1
fi

print_step "PROJECT INFORMATION"
echo "Local Project Path: ${PROJECT_PATH}"
echo "Remote Server: ${SERVER_USER}@${SERVER_IP}:${SERVER_PORT}"
echo "Remote Path: ${SERVER_PATH}"

# Create deployment timestamp
DEPLOYMENT_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
print_status "Deployment ID: ${DEPLOYMENT_TIMESTAMP}"

# Sync files to server
print_step "UPLOADING FILES TO SERVER"
print_status "Syncing project files (excluding unnecessary files)..."

rsync -avz --progress -e "ssh -p ${SERVER_PORT}" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    --exclude='Thumbs.db' \
    --exclude='*.log' \
    --exclude='.coverage' \
    --exclude='htmlcov' \
    --exclude='.nyc_output' \
    --exclude='dist' \
    --exclude='.next' \
    --exclude='.idea' \
    --exclude='.vscode' \
    --exclude='*.swp' \
    --exclude='*.swo' \
    --exclude='.env.local' \
    --exclude='.env.development.local' \
    --exclude='.env.test.local' \
    --exclude='.env.production.local' \
    "${PROJECT_PATH}/" \
    "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/"

print_status "File upload completed!"

# Create backup of environment files on server
print_step "BACKING UP ENVIRONMENT FILES"
ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "
    if [ -f '${SERVER_PATH}/backend/.env' ]; then
        cp '${SERVER_PATH}/backend/.env' '${SERVER_PATH}/backend/.env.backup.${DEPLOYMENT_TIMESTAMP}'
        echo 'Environment file backed up'
    fi
"

# Check if deployment script exists
if [ ! -f "${PROJECT_PATH}/scripts/deploy.sh" ]; then
    print_error "Deployment script not found: scripts/deploy.sh"
    exit 1
fi

# Make scripts executable on server
print_step "CONFIGURING SCRIPTS PERMISSIONS"
ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "
    chmod +x '${SERVER_PATH}/scripts/*.sh' 2>/dev/null || true
    chmod +x '${SERVER_PATH}/deploy-to-server.sh' 2>/dev/null || true
    echo 'Scripts permissions set'
"

# Run server setup if first deployment
print_warning "Checking if this is the first deployment..."
if ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "
    if [ ! -d '/root/ai-project-mgmt/data' ]; then
        echo 'FIRST_DEPLOYMENT=true'
    else
        echo 'FIRST_DEPLOYMENT=false'
    fi
" | grep -q "FIRST_DEPLOYMENT=true"; then
    print_step "FIRST DEPLOYMENT DETECTED"
    print_warning "Running server setup script first..."

    # Upload and run server setup
    scp -P ${SERVER_PORT} "${PROJECT_PATH}/server-setup.sh" ${SERVER_USER}@${SERVER_IP}:/root/
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "
        chmod +x /root/server-setup.sh
        ./server-setup.sh
    "

    # Re-upload files after setup
    print_status "Re-uploading files after server setup..."
    rsync -avz -e "ssh -p ${SERVER_PORT}" \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        "${PROJECT_PATH}/" \
        "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/"
fi

# Remind about environment configuration
if ! ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "
    if [ -f '${SERVER_PATH}/backend/.env' ]; then
        if grep -q 'your_secure_password_here' '${SERVER_PATH}/backend/.env' || \
           grep -q 'your_jwt_secret_key_here' '${SERVER_PATH}/backend/.env'; then
            echo 'ENV_NEEDS_CONFIG=true'
        else
            echo 'ENV_CONFIGURED=true'
        fi
    else
        echo 'ENV_MISSING=true'
    fi
" | grep -q "ENV_"; then

    print_step "ENVIRONMENT CONFIGURATION REQUIRED"
    print_warning "Please configure your environment variables on the server:"
    echo ""
    echo "1. SSH into the server:"
    echo "   ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP}"
    echo ""
    echo "2. Edit the environment file:"
    echo "   nano ${SERVER_PATH}/backend/.env"
    echo ""
    echo "3. Update these values:"
    echo "   - POSTGRES_PASSWORD (database password)"
    echo "   - JWT_SECRET (at least 32 characters)"
    echo "   - FRONTEND_URL (should be http://${SERVER_IP} or your domain)"
    echo ""

    read -p "Press Enter to continue deployment after configuring environment variables..."
fi

# Run deployment script on server
print_step "RUNNING DEPLOYMENT ON SERVER"
print_status "Executing deployment script..."

ssh -p ${SERVER_PORT} -t ${SERVER_USER}@${SERVER_IP} "
    cd ${SERVER_PATH}
    echo 'Starting deployment...'
    ./scripts/deploy.sh
"

# Verify deployment
print_step "VERIFYING DEPLOYMENT"
print_status "Checking service status..."

# Check if containers are running
CONTAINER_STATUS=$(ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "
    cd ${SERVER_PATH}
    docker-compose ps 2>/dev/null | grep -E 'Up|healthy' | wc -l || echo '0'
")

if [ "$CONTAINER_STATUS" -gt 0 ]; then
    print_status "✓ Services are running ($CONTAINER_STATUS services up)"
else
    print_warning "Some services may not be running. Check logs on server."
fi

# Check if ports are listening
print_status "Checking port availability..."
if ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "
    netstat -tulpn 2>/dev/null | grep -E ':(80|443|3000|8000)' | wc -l
" | grep -q '0'; then
    print_warning "Ports may not be listening. Check Nginx and application status."
else
    print_status "✓ Ports are listening"
fi

# Display deployment summary
print_step "DEPLOYMENT SUMMARY"
echo ""
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
echo "Server Details:"
echo "  - IP Address: ${SERVER_IP}"
echo "  - SSH Port: ${SERVER_PORT}"
echo "  - Project Path: ${SERVER_PATH}"
echo ""
echo "Application URLs:"
echo "  - Application: http://${SERVER_IP}"
echo "  - API: http://${SERVER_IP}/api"
echo ""
echo "Useful Commands:"
echo "  - Check status: ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} 'cd ${SERVER_PATH} && docker-compose ps'"
echo "  - View logs: ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} 'cd ${SERVER_PATH} && docker-compose logs -f'"
echo "  - Restart: ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} 'cd ${SERVER_PATH} && docker-compose restart'"
echo ""
echo "Next Steps:"
echo "  1. Configure Nginx and SSL (see DEPLOYMENT_GUIDE.md)"
echo "  2. Set up automatic backups"
echo "  3. Monitor server performance"
echo ""

# Create deployment log
LOG_FILE="${PROJECT_PATH}/deployments.log"
echo "[$(date)] Deployment ${DEPLOYMENT_TIMESTAMP} to ${SERVER_IP} completed" >> "$LOG_FILE"
print_status "Deployment logged to: $LOG_FILE"
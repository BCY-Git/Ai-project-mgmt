#!/bin/bash

# AI Project Management System - Server Setup Script
# This script prepares a fresh Linux server for deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default sudo password (can be provided via environment or command line)
SUDO_PASSWORD=""

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

# Usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --password PASSWORD  Sudo password for privileged operations"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SUDO_PASSWORD            Sudo password for privileged operations"
    echo ""
    echo "Notes:"
    echo "  - If running as root, sudo password is not required"
    echo "  - Password can be passed via -p flag or SUDO_PASSWORD environment variable"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--password)
            SUDO_PASSWORD="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Function to run sudo commands with password if needed
run_sudo() {
    if [[ $EUID -eq 0 ]]; then
        "$@"
    else
        echo "$SUDO_PASSWORD" | sudo -S "$@"
    fi
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    if [[ -z "$SUDO_PASSWORD" ]]; then
        print_error "This script must be run as root or with a sudo password"
        echo ""
        echo "Either:"
        echo "  1. Run as root: sudo ./server-setup.sh"
        echo "  2. Provide password: ./server-setup.sh -p YOUR_PASSWORD"
        echo "  3. Set environment: export SUDO_PASSWORD=YOUR_PASSWORD && ./server-setup.sh"
        exit 1
    fi
    echo "$SUDO_PASSWORD" | sudo -S true 2>/dev/null || {
        print_error "Invalid sudo password provided"
        exit 1
    }
fi

print_status "=== AI Project Management System - Server Setup ==="
print_status "Starting server initialization..."

# Update system
print_status "Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get autoremove -y
apt-get autoclean

# Install essential packages
print_status "Installing essential packages..."
apt-get install -y curl wget unzip nano git software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release build-essential

# Install Docker
print_status "Installing Docker..."

# Remove old versions
apt-get remove -y docker docker-engine docker.io containerd runc || true

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Install Docker Compose (standalone)
print_status "Installing Docker Compose..."
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
print_status "Verifying Docker installation..."
docker --version
docker-compose --version

# Create project directory
print_status "Creating project directory..."
mkdir -p /root/ai-project-mgmt
mkdir -p /root/ai-project-mgmt/data/{postgres,redis,uploads}
mkdir -p /root/backups
mkdir -p /var/log/ai-project-mgmt

# Set permissions
print_status "Setting permissions..."
chown -R root:root /root/ai-project-mgmt
chmod -R 755 /root/ai-project-mgmt
chmod 700 /root/ai-project-mgmt/data/postgres
chmod 700 /root/backups

# Install and configure UFW firewall
print_status "Configuring firewall..."
apt-get install -y ufw || true

# Reset firewall rules
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Optional: Allow additional ports if needed
# ufw allow 3000/tcp comment 'Frontend Dev'
# ufw allow 8000/tcp comment 'Backend Dev'

# Enable firewall
ufw --force enable

# Install Nginx for reverse proxy
print_status "Installing Nginx..."
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# Install Certbot for SSL certificates
print_status "Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Install htop for monitoring
print_status "Installing monitoring tools..."
apt-get install -y htop iotop

# Create Docker network
print_status "Creating Docker network..."
docker network create ai-project-mgmt-net || true

# Create a swap file (if system doesn't have enough RAM)
SWAP_SIZE="2G"
if [[ $(free -m | awk 'NR==2{print $2}') -lt 2000 ]]; then
    print_status "Creating swap file (${SWAP_SIZE})..."
    fallocate -l ${SWAP_SIZE} /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# Optimize system limits
print_status "Optimizing system limits..."
cat >> /etc/security/limits.conf << EOF

# AI Project Management System limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

# Configure Docker daemon
print_status "Configuring Docker daemon..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

# Restart Docker to apply changes
systemctl restart docker

# Add user to docker group (if you have a non-root user)
# usermod -aG docker username

# Create logrotate config for application logs
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/ai-project-mgmt << EOF
/var/log/ai-project-mgmt/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

# Print server information
print_status "Server setup completed!"
echo ""
echo -e "${GREEN}=== SERVER INFORMATION ===${NC}"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d '"' -f 2)"
echo "IP Address: $(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n 1)"
echo "RAM: $(free -h | grep Mem | awk '{print $2}')"
echo "Disk: $(df -h / | tail -n 1 | awk '{print $2}')"
echo ""
echo -e "${GREEN}=== SERVICE STATUS ===${NC}"
echo "Docker: $(systemctl is-active docker)"
echo "Nginx: $(systemctl is-active nginx)"
echo "UFW: $(ufw status | head -n 1)"
echo ""
echo -e "${GREEN}=== CREATED DIRECTORIES ===${NC}"
echo "Project Directory: /root/ai-project-mgmt"
echo "Data Directory: /root/ai-project-mgmt/data"
echo "Backups: /root/backups"
echo "Logs: /var/log/ai-project-mgmt"
echo ""
echo -e "${YELLOW}=== NEXT STEPS ===${NC}"
echo "1. Upload your project files to /root/ai-project-mgmt"
echo "2. Configure environment variables in backend/.env"
echo "3. Run: ./scripts/deploy.sh"
echo "4. Configure Nginx and SSL if using domain"
echo ""
echo -e "${GREEN}Server is ready for deployment!${NC}"
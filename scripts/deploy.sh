#!/bin/bash

# AI Project Management System - Deployment Script
# This script runs on the server to deploy the application

set -e  # Exit on any error

# Directory paths
PROJECT_DIR="/root/ai-project-mgmt"
DATA_DIR="${PROJECT_DIR}/data"
LOG_DIR="/var/log/ai-project-mgmt"

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

# Check if running from project directory
if [[ ! -f "${PROJECT_DIR}/docker-compose.yml" ]]; then
    print_error "docker-compose.yml not found in ${PROJECT_DIR}"
    print_error "Please run this script from the correct directory"
    exit 1
fi

# Change to project directory
cd "${PROJECT_DIR}"

print_status "=== AI Project Management System Deployment ==="
print_status "Deployment started at $(date)"

# Create log directory
mkdir -p "${LOG_DIR}"

# Check environment file
print_step "CHECKING ENVIRONMENT CONFIGURATION"
if [[ ! -f "backend/.env" ]]; then
    print_error "Environment file not found: backend/.env"
    echo ""
    echo "Please create the environment file with:"
    echo "  cp backend/.env.example backend/.env"
    echo "  nano backend/.env"
    echo ""
    exit 1
fi

# Check if environment variables are properly set
print_status "Validating environment variables..."
if grep -q "your_secure_password_here" backend/.env || \
   grep -q "your_jwt_secret_key_here" backend/.env; then
    print_error "Please update the default values in backend/.env"
    print_error "Check these values:"
    echo "  - POSTGRES_PASSWORD"
    echo "  - JWT_SECRET"
    echo ""
    exit 1
fi

# Stop existing services
print_step "STOPPING EXISTING SERVICES"
if docker-compose ps -q | grep -q .; then
    print_status "Stopping running containers..."
    docker-compose down
else
    print_status "No running containers found"
fi

# Clean up old images and containers
print_status "Cleaning up unused Docker resources..."
docker system prune -f

# Pull latest base images
print_status "Pulling latest Docker images..."
docker-compose pull

# Build application images
print_step "BUILDING APPLICATION IMAGES"
print_status "Building backend image..."
docker-compose build --no-cache backend

print_status "Building frontend image..."
docker-compose build --no-cache frontend

# Start database and redis first
print_step "STARTING DATABASE AND CACHE SERVICES"
print_status "Starting PostgreSQL and Redis..."
docker-compose up -d db redis

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check database connectivity
print_status "Checking database connectivity..."
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U postgres >/dev/null 2>&1; then
        print_status "Database is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Database failed to start in time"
        docker-compose logs db
        exit 1
    fi
    sleep 2
done

# Run database migrations
print_status "Running database migrations..."
docker-compose run --rm backend npm run migrate

# Start application services
print_step "STARTING APPLICATION SERVICES"
print_status "Starting backend service..."
docker-compose up -d backend

print_status "Starting frontend service..."
docker-compose up -d frontend

# Wait for services to be healthy
print_status "Waiting for services to be ready..."
sleep 15

# Check service health
print_step "VERIFYING SERVICE HEALTH"

# Check backend
BACKEND_UP=$(docker-compose ps -q backend | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check")
if [[ "$BACKEND_UP" == "healthy" ]] || docker-compose ps backend | grep -q "Up"; then
    print_status "✓ Backend service is running"
else
    print_warning "Backend service may not be fully ready"
fi

# Check frontend
FRONTEND_UP=$(docker-compose ps -q frontend | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check")
if [[ "$FRONTEND_UP" == "healthy" ]] || docker-compose ps frontend | grep -q "Up"; then
    print_status "✓ Frontend service is running"
else
    print_warning "Frontend service may not be fully ready"
fi

# Run health checks
BACKEND_URL="http://localhost:8000/api/health"
FRONTEND_URL="http://localhost:3000"

print_status "Performing health checks..."
if curl -s "$BACKEND_URL" >/dev/null 2>&1; then
    print_status "✓ Backend API is responding"
else
    print_warning "Backend API may not be ready yet"
fi

if curl -s "$FRONTEND_URL" >/dev/null 2>&1; then
    print_status "✓ Frontend is responding"
else
    print_warning "Frontend may not be ready yet"
fi

# Show container status
print_step "CONTAINER STATUS"
docker-compose ps

# Save container logs
print_status "Saving deployment logs..."
docker-compose logs --no-color > "${LOG_DIR}/deploy_$(date +%Y%m%d_%H%M%S).log"

# Display deployment summary
print_step "DEPLOYMENT SUMMARY"
echo ""
print_status "Deployment completed successfully at $(date)"
echo ""
echo "Services Status:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Useful Commands:"
echo "  - View logs: docker-compose logs -f [service_name]"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - View container stats: docker stats"
echo ""

# Get server IP for display
SERVER_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n 1)

print_status "Your application is now available at:"
echo "  - HTTP: http://${SERVER_IP}"
echo "  - API: http://${SERVER_IP}/api"
echo ""

# Display next steps
print_warning "Next Steps:"
echo "1. Configure Nginx reverse proxy (see DEPLOYMENT_GUIDE.md)"
echo "2. Set up SSL certificates"
echo "3. Configure automated backups"
echo "4. Set up monitoring and alerts"
echo ""

print_status "Deployment finished!"
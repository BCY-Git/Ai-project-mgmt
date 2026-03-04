#!/bin/bash

# AI Project Management System Deployment Script
# This script handles building and deploying the application to production

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

# Load environment variables
print_status "Loading environment variables from $ENV_FILE"
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Function to backup database
backup_database() {
    if [ "$BACKUP_DB" = true ]; then
        print_status "Creating database backup..."

        BACKUP_DIR="database/backups"
        BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

        # Create backup directory if it doesn't exist
        mkdir -p "$BACKUP_DIR"

        # Run backup
        docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
            -U "$DATABASE_USERNAME" \
            -d "$DATABASE_NAME" \
            > "$BACKUP_FILE"

        print_status "Database backup created: $BACKUP_FILE"

        # Compress backup
        gzip "$BACKUP_FILE"
        print_status "Backup compressed: ${BACKUP_FILE}.gz"
    fi
}

# Function to build and deploy
build_and_deploy() {
    print_status "Starting deployment process..."

    # Stop existing services
    print_status "Stopping existing services..."
    docker-compose -f docker-compose.prod.yml down

    if [ "$SKIP_BUILD" = false ]; then
        # Build new images
        print_status "Building Docker images..."
        docker-compose -f docker-compose.prod.yml build --no-cache

        # Prune old images
        print_status "Cleaning up old Docker images..."
        docker image prune -f
    else
        print_warning "Skipping build process as requested"
    fi

    # Start services
    print_status "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d

    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 10

    # Check service health
    for service in backend postgres redis; do
        print_status "Checking $service health..."
        if docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "Up (healthy)"; then
            print_status "$service is healthy"
        else
            print_warning "$service might not be fully ready yet"
        fi
    done

    # Run database migrations if needed
    print_status "Running database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T backend npm run migration:run || true
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."

    # Check if nginx is responding
    sleep 5
    if curl -f -s http://localhost/health > /dev/null; then
        print_status "Frontend is responding"
    else
        print_error "Frontend health check failed"
        return 1
    fi

    # Check backend API
    if curl -f -s http://localhost/api/health > /dev/null; then
        print_status "Backend API is responding"
    else
        print_error "Backend API health check failed"
        return 1
    fi

    print_status "Deployment verification completed successfully!"
}

# Main execution
main() {
    print_status "AI Project Management System Deployment"
    print_status "====================================="

    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed!"
        exit 1
    fi

    # Create SSL directory if it doesn't exist
    mkdir -p nginx/ssl

    # Check if SSL certificates exist
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        print_warning "SSL certificates not found in nginx/ssl/"
        print_warning "Please add your SSL certificates before running in production"
        print_status "For development, you can generate self-signed certificates:"
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

    # Create necessary directories
    mkdir -p logs/nginx logs/backend logs/worker uploads database/backups

    # Backup database if requested
    backup_database

    # Build and deploy
    build_and_deploy

    # Verify deployment
    if verify_deployment; then
        print_status "🎉 Deployment completed successfully!"
        print_status ""
        print_status "Services are running at:"
        print_status "  Frontend: https://localhost"
        print_status "  Backend API: https://localhost/api"
        print_status ""
        print_status "To view logs: docker-compose -f docker-compose.prod.yml logs -f [service]"
        print_status "To stop: docker-compose -f docker-compose.prod.yml down"
    else
        print_error "Deployment verification failed!"
        print_error "Check the logs with: docker-compose -f docker-compose.prod.yml logs"
        exit 1
    fi
}

# Error handling
trap 'print_error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"
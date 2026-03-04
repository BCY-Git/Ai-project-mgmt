# AI Project Management System - Production Deployment Guide

This guide explains how to deploy the AI Project Management System to production using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- SSL certificates for HTTPS
- Production environment variables
- Git for cloning the repository

## Quick Start

1. **Clone and prepare the repository**
   ```bash
   git clone <repository-url>
   cd ai-project-mgmt
   chmod +x deploy.sh
   ```

2. **Set up environment variables**
   ```bash
   cp .env.prod.example .env.prod
   # Edit .env.prod with your actual values
   ```

3. **Add SSL certificates**
   ```bash
   mkdir -p nginx/ssl
   # Copy your certificates to nginx/ssl/cert.pem and nginx/ssl/key.pem
   ```

4. **Deploy**
   ```bash
   ./deploy.sh
   ```

## Deployment Script Options

The `deploy.sh` script supports several options:

- `--backup-db`: Create a database backup before deployment
- `--skip-build`: Skip the build process and just redeploy existing images
- `--env FILE`: Use a specific environment file (default: .env.prod)
- `--help`: Show all available options

Examples:
```bash
# Deploy with database backup
./deploy.sh --backup-db

# Redeploy without rebuilding
./deploy.sh --skip-build

# Use custom environment file
./deploy.sh --env .env.staging
```

## Architecture

The production deployment includes:

- **Nginx**: Reverse proxy with SSL termination
- **Frontend**: Production Vue.js build served by Nginx
- **Backend**: NestJS API server
- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Worker**: Background job processor

## SSL/TLS Setup

### Production SSL Certificates

1. Obtain certificates from your certificate authority
2. Place them in `nginx/ssl/`:
   - `cert.pem`: Certificate file
   - `key.pem`: Private key file

### Self-Signed Certificates (Development Only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

## Environment Variables

Key environment variables in `.env.prod`:

- `DATABASE_*`: PostgreSQL connection settings
- `REDIS_*`: Redis connection settings
- `JWT_SECRET`: Secret for JWT tokens
- `ANTHROPIC_API_KEY`: API key for AI features
- `CORS_ORIGIN`: Allowed frontend domain

## Database Management

### Backup the Database

Automatic backup during deployment:
```bash
./deploy.sh --backup-db
```

Manual backup:
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U your_username -d ai_project_mgmt_prod > backup.sql
```

### Restore from Backup

```bash
# Stop the application
docker-compose -f docker-compose.prod.yml stop backend backend-worker

# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql \
  -U your_username -d ai_project_mgmt_prod < backup.sql

# Restart services
docker-compose -f docker-compose.prod.yml start backend backend-worker
```

## Monitoring and Logs

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Health Checks

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Manual health checks
curl -k https://localhost/health      # Frontend
curl -k https://localhost/api/health   # Backend
```

## Scaling

### Horizontal Scaling

To run multiple instances of the backend:

```yaml
# In docker-compose.prod.yml
backend:
  # ... existing config ...
  deploy:
    replicas: 3
```

### Resource Limits

Add resource constraints in `docker-compose.prod.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Security Recommendations

1. **Regular Updates**: Keep Docker images updated
2. **Secret Management**: Use proper secret management in production
3. **Network Security**: Configure firewall rules
4. **Backups**: Regular automated backups
5. **Monitoring**: Set up monitoring and alerting
6. **SSL Certificates**: Use certificates from trusted CAs
7. **Environment Security**: Protect environment variables

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using ports 80/443
   sudo lsof -i :80
   sudo lsof -i :443
   ```

2. **Permission Errors**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   chmod +x deploy.sh
   ```

3. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose -f docker-compose.prod.yml logs postgres

   # Verify connection
   docker-compose -f docker-compose.prod.yml exec backend ping postgres
   ```

4. **SSL Certificate Errors**
   ```bash
   # Verify certificate
   openssl x509 -in nginx/ssl/cert.pem -text -noout
   ```

### Cleanup

```bash
# Remove all containers and volumes (DANGEROUS - wipes data!)
docker-compose -f docker-compose.prod.yml down -v

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Maintenance

### Regular Tasks

1. **Weekly**: Check for security updates
2. **Monthly**: Update Docker images and redeploy
3. **Quarterly**: Review and rotate secrets
4. **Yearly**: SSL certificate renewal

### Update Process

```bash
# Pull latest code
git pull origin main

# Update with backup
./deploy.sh --backup-db

# Or update without downtime (if no DB changes)
./deploy.sh --skip-build
```

## Support

For deployment issues:

1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Check resource usage: `docker stats`
4. Review this guide and troubleshoot section
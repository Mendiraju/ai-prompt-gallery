# VPS Deployment Guide

## Ubuntu Server Setup

### 1. Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install curl wget git ufw -y

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. Install Node.js

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 4. Install Nginx (Optional but Recommended)

```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

## Application Deployment

### 1. Deploy Application

```bash
# Create application directory
sudo mkdir -p /var/www/ai-prompt-gallery
sudo chown $USER:$USER /var/www/ai-prompt-gallery

# Clone repository
cd /var/www/ai-prompt-gallery
git clone <your-repository-url> .

# Install dependencies
npm install --production

# Create production environment file
cp .env.example .env
```

### 2. Configure Environment Variables

```bash
# Edit environment file
nano .env
```

**Production .env configuration:**
```bash
# Security - CHANGE THESE VALUES
JWT_SECRET=your-super-secure-random-jwt-secret-key-minimum-256-bits
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-password

# Server Configuration
PORT=3000
NODE_ENV=production

# Database (SQLite will be created automatically)
# DB_PATH=./prompts.db
```

### 3. Start Application with PM2

```bash
# Start application
npm run pm2-start

# Check status
pm2 status

# View logs
pm2 logs ai-prompt-gallery

# Monitor
pm2 monit
```

### 4. Configure PM2 Startup

```bash
# Generate startup script
pm2 startup

# Follow the instructions (usually run the generated command with sudo)

# Save current PM2 processes
pm2 save
```

## Nginx Configuration (Recommended)

### 1. Create Nginx Configuration

```bash
# Create site configuration
sudo nano /etc/nginx/sites-available/ai-prompt-gallery
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Main application proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        expires 1M;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints with rate limiting
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting (optional)
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
        limit_req zone=api burst=20 nodelay;
    }
}
```

### 2. Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ai-prompt-gallery /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL Certificate (Let's Encrypt)

### 1. Install Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obtain SSL Certificate

```bash
# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Check current rules
sudo ufw status

# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS

# Deny all other incoming traffic
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### 2. Fail2Ban (Optional)

```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Configure for SSH protection
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Application Security

```bash
# Set proper file permissions
sudo chown -R $USER:$USER /var/www/ai-prompt-gallery
chmod -R 755 /var/www/ai-prompt-gallery
chmod 600 /var/www/ai-prompt-gallery/.env

# Secure database file
chmod 644 /var/www/ai-prompt-gallery/prompts.db
```

## Monitoring and Maintenance

### 1. PM2 Monitoring

```bash
# Check application status
pm2 status

# View logs
pm2 logs ai-prompt-gallery

# Restart application
pm2 restart ai-prompt-gallery

# Monitor resources
pm2 monit
```

### 2. System Monitoring

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check service status
sudo systemctl status nginx
sudo systemctl status ufw
```

### 3. Log Management

```bash
# Application logs
pm2 logs ai-prompt-gallery --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

## Backup Strategy

### 1. Database Backup

```bash
# Create backup script
nano /home/$USER/backup-db.sh
```

**Backup script:**
```bash
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DB_PATH="/var/www/ai-prompt-gallery/prompts.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH "$BACKUP_DIR/prompts_$DATE.db"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "prompts_*.db" -mtime +7 -delete

echo "Database backup completed: prompts_$DATE.db"
```

```bash
# Make executable
chmod +x /home/$USER/backup-db.sh

# Add to crontab for daily backups
crontab -e
# Add line: 0 2 * * * /home/$USER/backup-db.sh
```

### 2. Application Backup

```bash
# Create full backup
tar -czf ai-prompt-gallery-$(date +%Y%m%d).tar.gz /var/www/ai-prompt-gallery
```

## Updating Application

### 1. Update Process

```bash
# Navigate to application directory
cd /var/www/ai-prompt-gallery

# Backup current version
cp prompts.db prompts_backup_$(date +%Y%m%d).db

# Pull latest changes
git pull origin main

# Install new dependencies
npm install --production

# Restart application
pm2 restart ai-prompt-gallery

# Check status
pm2 status
```

## Troubleshooting

### Common Issues

1. **Application won't start:**
```bash
# Check logs
pm2 logs ai-prompt-gallery

# Check environment file
cat .env

# Verify Node.js version
node --version
```

2. **Port already in use:**
```bash
# Find process using port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

3. **Database permissions:**
```bash
# Fix database permissions
chmod 644 /var/www/ai-prompt-gallery/prompts.db
chown $USER:$USER /var/www/ai-prompt-gallery/prompts.db
```

4. **Nginx configuration errors:**
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### Performance Issues

1. **High memory usage:**
```bash
# Monitor PM2 processes
pm2 monit

# Restart application
pm2 restart ai-prompt-gallery
```

2. **Slow response times:**
```bash
# Check system resources
htop

# Optimize Nginx (increase worker connections)
sudo nano /etc/nginx/nginx.conf
```

### Recovery Procedures

1. **Database corruption:**
```bash
# Restore from backup
cp /home/$USER/backups/prompts_YYYYMMDD_HHMMSS.db /var/www/ai-prompt-gallery/prompts.db
pm2 restart ai-prompt-gallery
```

2. **Complete application failure:**
```bash
# Restore from git
cd /var/www/ai-prompt-gallery
git reset --hard HEAD
npm install --production
pm2 restart ai-prompt-gallery
```

This guide provides a complete production deployment setup for your AI Prompt Gallery on a VPS running Ubuntu.
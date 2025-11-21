#!/bin/bash
# AWS EC2 PocketBase Setup Script
# Run this script on a fresh Ubuntu 22.04 EC2 instance

set -e

echo "🚀 Starting PocketBase setup on AWS EC2..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "📋 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install nginx -y

# Install Certbot
echo "🔒 Installing Certbot for SSL..."
sudo apt install certbot python3-certbot-nginx -y

# Create PocketBase directory
echo "📁 Creating PocketBase directory structure..."
mkdir -p ~/pocketbase/{pb_data,pb_migrations}
cd ~/pocketbase

# Create docker-compose.yml
echo "📝 Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:0.22.27
    container_name: pocketbase
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb/pb_data
      - ./pb_migrations:/pb/pb_migrations
    environment:
      - PB_ENCRYPTION_KEY=${PB_ENCRYPTION_KEY}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8090/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5
EOF

# Generate encryption key
echo "🔑 Generating encryption key..."
PB_ENCRYPTION_KEY=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
echo "PB_ENCRYPTION_KEY=$PB_ENCRYPTION_KEY" > .env
echo ""
echo "✅ Encryption key generated: $PB_ENCRYPTION_KEY"
echo "⚠️  SAVE THIS KEY! You'll need it for backups and migrations."
echo ""

# Create backup script
echo "💾 Creating backup script..."
cat > ~/backup-pocketbase.sh << 'BACKUP_EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Create backup
docker exec pocketbase tar -czf /tmp/pb_backup_$DATE.tar.gz -C /pb pb_data

# Copy backup out of container
docker cp pocketbase:/tmp/pb_backup_$DATE.tar.gz $BACKUP_DIR/

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "pb_backup_*.tar.gz" -mtime +7 -delete

echo "✅ Backup created: $BACKUP_DIR/pb_backup_$DATE.tar.gz"
BACKUP_EOF

chmod +x ~/backup-pocketbase.sh

# Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/pocketbase.service > /dev/null << SERVICE_EOF
[Unit]
Description=PocketBase Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/$USER/pocketbase
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Enable services
echo "🔄 Enabling services..."
sudo systemctl enable docker
sudo systemctl enable pocketbase

# Start PocketBase
echo "🚀 Starting PocketBase..."
cd ~/pocketbase
docker-compose up -d

# Wait for PocketBase to start
echo "⏳ Waiting for PocketBase to start..."
sleep 5

# Check status
if docker ps | grep -q pocketbase; then
    echo "✅ PocketBase is running!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set up Nginx reverse proxy (see AWS_POCKETBASE_DEPLOYMENT.md)"
    echo "2. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
    echo "3. Access admin UI: http://$(curl -s ifconfig.me):8090/_/"
    echo "4. Create admin account"
    echo "5. Set up automated backups: (crontab -l 2>/dev/null; echo '0 2 * * * /home/$USER/backup-pocketbase.sh') | crontab -"
    echo ""
    echo "🔑 Your encryption key is saved in ~/pocketbase/.env"
else
    echo "❌ PocketBase failed to start. Check logs: docker-compose logs"
    exit 1
fi


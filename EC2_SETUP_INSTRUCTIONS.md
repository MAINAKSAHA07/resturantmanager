# EC2 PocketBase Setup Instructions

## Your EC2 Instance Details
- **Instance ID**: i-0f4e21e0f6c1bc541
- **Public IP**: 18.218.140.182
- **Public DNS**: ec2-18-218-140-182.us-east-2.compute.amazonaws.com
- **Region**: us-east-2 (Ohio)
- **Instance Type**: t3.micro

## Step 1: Connect to EC2 Instance

### Option A: Using SSH (Terminal)
```bash
cd "/Users/mainaksaha/Desktop/MASTERS/Project/Resturant manager"
chmod 400 resturant.pem

# Try with ubuntu user (Ubuntu/Debian)
ssh -i resturant.pem ubuntu@18.218.140.182

# OR try with ec2-user (Amazon Linux)
ssh -i resturant.pem ec2-user@18.218.140.182
```

### Option B: Using AWS Systems Manager Session Manager
If SSH doesn't work, you can use AWS Console:
1. Go to EC2 Console → Instances
2. Select your instance
3. Click "Connect" → "Session Manager"
4. This opens a browser-based terminal

## Step 2: Install Docker and Dependencies

Once connected, run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Log out and back in for group changes
exit
```

## Step 3: Set Up PocketBase

```bash
# Create directory structure
mkdir -p ~/pocketbase/{pb_data,pb_migrations}
cd ~/pocketbase

# Create docker-compose.yml
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

# Generate encryption key (32 characters)
PB_ENCRYPTION_KEY=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
echo "PB_ENCRYPTION_KEY=$PB_ENCRYPTION_KEY" > .env
echo "✅ Encryption key generated: $PB_ENCRYPTION_KEY"
echo "⚠️  SAVE THIS KEY! You'll need it for backups and migrations."

# Start PocketBase
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Step 4: Configure Security Group

1. Go to **AWS Console** → **EC2** → **Security Groups**
2. Find your instance's security group
3. **Edit inbound rules**:
   - **Type**: HTTP
   - **Port**: 80
   - **Source**: 0.0.0.0/0
   - **Description**: Allow HTTP
   
   - **Type**: HTTPS
   - **Port**: 443
   - **Source**: 0.0.0.0/0
   - **Description**: Allow HTTPS
   
   - **Type**: Custom TCP
   - **Port**: 8090
   - **Source**: Your IP (for initial setup)
   - **Description**: PocketBase Admin (temporary)

## Step 5: Set Up Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/pocketbase
```

Add this configuration (replace `your-domain.com` with your domain or use the public IP for now):

```nginx
server {
    listen 80;
    server_name 18.218.140.182;  # Use your public IP or domain

    location / {
        proxy_pass http://localhost:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        client_max_body_size 10M;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/pocketbase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: Access PocketBase

1. **Via Public IP (HTTP)**: http://18.218.140.182:8090/_/
2. **Via Nginx (HTTP)**: http://18.218.140.182/_/

Create your admin account when you first access it.

## Step 7: Set Up SSL (Optional but Recommended)

If you have a domain name pointing to this IP:

```bash
sudo certbot --nginx -d your-domain.com
```

This will automatically configure HTTPS.

## Step 8: Set Up Auto-Start

```bash
# Enable Docker to start on boot
sudo systemctl enable docker

# Create systemd service for PocketBase
sudo nano /etc/systemd/system/pocketbase.service
```

Add:

```ini
[Unit]
Description=PocketBase Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/pocketbase
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
```

## Step 9: Update Netlify Environment Variables

Once PocketBase is running, update your Netlify sites:

### For Customer Web:
```bash
cd apps/customer-web
netlify env:set POCKETBASE_URL "http://18.218.140.182:8090"
netlify env:set NEXT_PUBLIC_POCKETBASE_URL "http://18.218.140.182:8090"
netlify env:set PB_ADMIN_EMAIL "your-admin-email@example.com"
netlify env:set PB_ADMIN_PASSWORD "your-admin-password"
```

### For Backoffice:
```bash
cd apps/backoffice
netlify env:set POCKETBASE_URL "http://18.218.140.182:8090"
netlify env:set NEXT_PUBLIC_POCKETBASE_URL "http://18.218.140.182:8090"
netlify env:set PB_ADMIN_EMAIL "your-admin-email@example.com"
netlify env:set PB_ADMIN_PASSWORD "your-admin-password"
```

## Troubleshooting

### Can't Connect via SSH
- Verify the PEM file is correct
- Check Security Group allows SSH (port 22) from your IP
- Try using AWS Systems Manager Session Manager instead

### PocketBase Not Accessible
- Check Security Group allows port 8090 (or 80/443 if using Nginx)
- Verify Docker container is running: `docker ps`
- Check logs: `docker-compose logs`

### Nginx Issues
- Test configuration: `sudo nginx -t`
- Check Nginx status: `sudo systemctl status nginx`
- View logs: `sudo tail -f /var/log/nginx/error.log`

## Next Steps

1. ✅ Set up PocketBase on EC2
2. ✅ Create admin account
3. ✅ Set up collections (use scripts in `pocketbase/scripts/`)
4. ✅ Run seed data
5. ✅ Update Netlify environment variables
6. ✅ Configure CORS in PocketBase for Netlify domains
7. ✅ Deploy to production on Netlify


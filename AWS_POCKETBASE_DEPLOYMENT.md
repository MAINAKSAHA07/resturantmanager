# AWS Deployment Guide for PocketBase

This guide covers multiple ways to deploy PocketBase on AWS. Choose the option that best fits your needs.

## Prerequisites

- AWS Account
- AWS CLI installed and configured (optional, but helpful)
- Basic knowledge of AWS services
- Domain name (optional, but recommended for production)

## Option 1: AWS EC2 (Recommended for Production)

EC2 gives you full control and is cost-effective for long-running services.

### Step 1: Launch EC2 Instance

1. **Go to AWS Console** → EC2 → Launch Instance
2. **Choose an AMI**: 
   - **Ubuntu 22.04 LTS** (recommended) or Amazon Linux 2023
3. **Instance Type**: 
   - **t3.micro** (Free tier eligible) for testing
   - **t3.small** or **t3.medium** for production
4. **Key Pair**: Create or select an existing key pair (save the `.pem` file!)
5. **Network Settings**: 
   - Allow HTTP (port 80) and HTTPS (port 443) traffic
   - Allow Custom TCP (port 8090) from your IP for initial setup
6. **Storage**: 20 GB minimum (gp3 SSD recommended)
7. **Launch Instance**

### Step 2: Connect to EC2 Instance

```bash
# Replace with your key file and instance IP
ssh -i your-key.pem ubuntu@your-ec2-ip-address
```

### Step 3: Install Docker on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes to take effect
exit
```

### Step 4: Set Up PocketBase

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

### Step 5: Set Up Nginx Reverse Proxy (HTTPS)

```bash
# Install Nginx
sudo apt install nginx -y

# Install Certbot for Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/pocketbase
```

Add this configuration (replace `your-domain.com` with your domain):

```nginx
server {
    listen 80;
    server_name your-domain.com;

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
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/pocketbase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure HTTPS and redirect HTTP to HTTPS
```

### Step 6: Configure Security Group

1. Go to **EC2 Console** → **Security Groups**
2. Find your instance's security group
3. **Edit inbound rules**:
   - Remove port 8090 (no longer needed, Nginx handles it)
   - Keep HTTP (80) and HTTPS (443) open
   - Optionally restrict to specific IPs for admin access

### Step 7: Set Up Auto-Start on Reboot

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

### Step 8: Set Up Automated Backups

```bash
# Create backup script
nano ~/backup-pocketbase.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Create backup
docker exec pocketbase tar -czf /tmp/pb_backup_$DATE.tar.gz -C /pb pb_data

# Copy backup out of container
docker cp pocketbase:/tmp/pb_backup_$DATE.tar.gz $BACKUP_DIR/

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "pb_backup_*.tar.gz" -mtime +7 -delete

# Optional: Upload to S3
# aws s3 cp $BACKUP_DIR/pb_backup_$DATE.tar.gz s3://your-bucket/backups/
```

```bash
# Make executable
chmod +x ~/backup-pocketbase.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-pocketbase.sh") | crontab -
```

## Option 2: AWS ECS/Fargate (Containerized, Serverless)

Best for scalable, managed container deployments.

### Step 1: Create ECR Repository

```bash
# Install AWS CLI if not already installed
# Configure AWS credentials: aws configure

# Create ECR repository
aws ecr create-repository --repository-name pocketbase --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Step 2: Build and Push Docker Image

```bash
# Build image
docker build -f Dockerfile.pocketbase -t pocketbase:latest .

# Tag for ECR
docker tag pocketbase:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/pocketbase:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/pocketbase:latest
```

### Step 3: Create ECS Task Definition

1. Go to **ECS Console** → **Task Definitions** → **Create new**
2. **Task Definition Name**: `pocketbase`
3. **Container**:
   - **Name**: `pocketbase`
   - **Image**: `<account-id>.dkr.ecr.us-east-1.amazonaws.com/pocketbase:latest`
   - **Port mappings**: `8090:8090`
   - **Environment variables**:
     - `PB_ENCRYPTION_KEY`: (your encryption key)
   - **Mount points**:
     - **Source volume**: `pb_data`
     - **Container path**: `/pb/pb_data`
4. **Volumes**: Add `pb_data` (use EFS for persistent storage)
5. **Create**

### Step 4: Create ECS Service

1. Go to **ECS Console** → **Clusters** → **Create Cluster**
2. Choose **Fargate** (serverless) or **EC2**
3. **Service**:
   - **Task Definition**: `pocketbase`
   - **Service name**: `pocketbase-service`
   - **Desired tasks**: `1`
   - **Load balancer**: Create Application Load Balancer
   - **Health check**: `/api/health`

### Step 5: Set Up Application Load Balancer

1. **Target Group**: Create new, port 8090
2. **Listener**: HTTPS (443) with SSL certificate from ACM
3. **Security Group**: Allow HTTPS (443) from internet

## Option 3: AWS Lightsail (Simplest)

Easiest option for beginners, includes everything in one package.

### Step 1: Create Lightsail Instance

1. Go to **AWS Lightsail** → **Create instance**
2. **Platform**: Linux/Unix
3. **Blueprint**: Ubuntu 22.04 LTS
4. **Instance plan**: $5/month (1 GB RAM) or higher
5. **Instance name**: `pocketbase`
6. **Create instance**

### Step 2: Connect and Set Up

```bash
# Use Lightsail browser SSH or connect via SSH key
# Follow the same steps as EC2 (Steps 3-8 above)
```

### Step 3: Set Up Static IP and Domain

1. **Lightsail Console** → **Networking** → **Create static IP**
2. Attach to your instance
3. **DNS Zone** (optional): Create DNS zone and add A record

## Option 4: AWS Elastic Beanstalk (Managed Platform)

Good for quick deployment with minimal configuration.

### Step 1: Prepare Application

```bash
# Create application bundle
mkdir -p pocketbase-eb
cd pocketbase-eb

# Copy Dockerfile
cp ../Dockerfile.pocketbase ./Dockerfile

# Create .ebextensions/pocketbase.config
mkdir .ebextensions
cat > .ebextensions/pocketbase.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    PB_ENCRYPTION_KEY: 'your-encryption-key-here'
  aws:elasticbeanstalk:container:docker:
    Ports: '8090'
EOF

# Create zip file
zip -r ../pocketbase-eb.zip .
```

### Step 2: Deploy to Elastic Beanstalk

1. Go to **Elastic Beanstalk** → **Create application**
2. **Platform**: Docker
3. **Upload** your `pocketbase-eb.zip`
4. **Configure** environment variables
5. **Deploy**

## Environment Variables for Netlify

Once PocketBase is deployed on AWS, update your Netlify environment variables:

```
POCKETBASE_URL=https://your-aws-pocketbase-url.com
PB_ADMIN_EMAIL=your-admin-email@example.com
PB_ADMIN_PASSWORD=your-admin-password
NEXT_PUBLIC_POCKETBASE_URL=https://your-aws-pocketbase-url.com
```

## Cost Comparison

| Option | Monthly Cost (approx) | Best For |
|-------|----------------------|----------|
| **EC2 t3.micro** | $0 (Free tier) / $8-10 | Production, full control |
| **EC2 t3.small** | $15-20 | Production, moderate traffic |
| **ECS Fargate** | $15-30 | Scalable, managed |
| **Lightsail** | $5-10 | Simple, beginner-friendly |
| **Elastic Beanstalk** | $0 (just EC2 costs) | Quick deployment |

## Security Best Practices

1. **Use Security Groups**: Only allow necessary ports (80, 443)
2. **Enable AWS WAF**: Protect against common attacks
3. **Use IAM Roles**: Don't hardcode AWS credentials
4. **Regular Backups**: Set up automated backups to S3
5. **SSL/TLS**: Always use HTTPS in production
6. **Update Regularly**: Keep Docker and system packages updated
7. **Monitor**: Use CloudWatch for logs and metrics

## Monitoring and Logs

### CloudWatch Setup

```bash
# Install CloudWatch agent (on EC2)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure (follow prompts)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### View Logs

- **EC2**: `docker-compose logs -f` or CloudWatch
- **ECS**: CloudWatch Logs automatically
- **Lightsail**: Browser-based logs or SSH

## Troubleshooting

### PocketBase Not Accessible

1. Check security group rules (ports 80, 443)
2. Verify Nginx is running: `sudo systemctl status nginx`
3. Check Docker container: `docker ps`
4. View logs: `docker-compose logs`

### SSL Certificate Issues

1. Ensure domain DNS points to your instance
2. Check firewall allows port 80 (for Let's Encrypt verification)
3. Verify Nginx configuration: `sudo nginx -t`

### High Costs

1. Use Reserved Instances for EC2 (save up to 75%)
2. Use Spot Instances for non-critical workloads
3. Monitor with AWS Cost Explorer
4. Set up billing alerts

## Next Steps

After PocketBase is deployed on AWS:

1. ✅ Access admin UI: `https://your-domain.com/_/`
2. ✅ Create admin account
3. ✅ Set up collections
4. ✅ Run seed data
5. ✅ Configure CORS for Netlify domains
6. ✅ Update Netlify environment variables
7. ✅ Test the full stack

## Support Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [PocketBase Documentation](https://pocketbase.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)


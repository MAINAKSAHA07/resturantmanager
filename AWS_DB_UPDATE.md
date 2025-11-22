# AWS Database Update Commands

This document provides commands to update the PocketBase database on AWS.

## Quick Start

### Using the Helper Script

```bash
# Show available scripts
./update-db-aws.sh help

# Run a specific script
./update-db-aws.sh cleanup-duplicate-tables
```

### Direct Commands

#### Set Environment Variables

```bash
export AWS_POCKETBASE_URL="http://18.218.140.182:8090"
export PB_ADMIN_EMAIL="mainaksaha0807@gmail.com"
export PB_ADMIN_PASSWORD="your-password"
```

#### Run Database Update Scripts

```bash
# Cleanup duplicate locations (with migration)
AWS_POCKETBASE_URL="http://18.218.140.182:8090" \
PB_ADMIN_EMAIL="mainaksaha0807@gmail.com" \
PB_ADMIN_PASSWORD="your-password" \
node pocketbase/scripts/cleanup-duplicate-locations-migrate.js

# Cleanup duplicate menu items
AWS_POCKETBASE_URL="http://18.218.140.182:8090" \
PB_ADMIN_EMAIL="mainaksaha0807@gmail.com" \
PB_ADMIN_PASSWORD="your-password" \
node pocketbase/scripts/cleanup-duplicate-menu-items.js

# Cleanup duplicate tables
AWS_POCKETBASE_URL="http://18.218.140.182:8090" \
PB_ADMIN_EMAIL="mainaksaha0807@gmail.com" \
PB_ADMIN_PASSWORD="your-password" \
node pocketbase/scripts/cleanup-duplicate-tables.js
```

## Available Scripts

### Cleanup Scripts (Modify Database)

1. **cleanup-duplicate-locations-migrate.js**
   - Removes duplicate locations and migrates all references
   - Keeps the oldest location record

2. **cleanup-duplicate-menu-items.js**
   - Removes duplicate menu categories and items
   - Migrates all references to kept records

3. **cleanup-duplicate-tables.js**
   - Removes duplicate tables
   - Migrates orders to kept table records

### Check Scripts (Read-Only)

1. **check-duplicate-menu-items.js**
   - Lists duplicate menu categories and items
   - Does not modify the database

2. **check-duplicate-tables.js**
   - Lists duplicate tables
   - Does not modify the database

## Using NPM Scripts

You can also use the npm scripts defined in `package.json`:

```bash
# Set AWS environment variables first
export AWS_POCKETBASE_URL="http://18.218.140.182:8090"
export PB_ADMIN_EMAIL="mainaksaha0807@gmail.com"
export PB_ADMIN_PASSWORD="your-password"

# Then run npm scripts
npm run pb:cleanup-duplicate-locations-migrate
npm run pb:cleanup-duplicate-menu
npm run pb:cleanup-duplicate-tables
npm run pb:check-duplicate-menu
npm run pb:check-duplicate-tables
```

## SSH to AWS EC2 and Run Commands

If you need to run commands directly on the AWS EC2 instance:

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@18.218.140.182

# Navigate to project directory (if cloned)
cd ~/restaurant-manager

# Set environment variables
export AWS_POCKETBASE_URL="http://localhost:8090"
export PB_ADMIN_EMAIL="mainaksaha0807@gmail.com"
export PB_ADMIN_PASSWORD="your-password"

# Run the script
node pocketbase/scripts/cleanup-duplicate-tables.js
```

## Important Notes

1. **Backup First**: Always backup your database before running cleanup scripts
2. **Test Locally**: Test scripts on local database first if possible
3. **Verify Credentials**: Ensure `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` are correct
4. **Check AWS URL**: Verify `AWS_POCKETBASE_URL` points to the correct AWS instance

## Backup Command

Before running any update scripts, create a backup:

```bash
# On AWS EC2 instance
docker exec pocketbase tar -czf /tmp/pb_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /pb pb_data
docker cp pocketbase:/tmp/pb_backup_*.tar.gz ~/backups/
```


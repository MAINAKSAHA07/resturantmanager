# Netlify Deployment Guide

This guide will help you deploy both the **Customer Web** and **Backoffice** Next.js applications to Netlify.

## ⚠️ Important: PocketBase Backend

**PocketBase cannot run on Netlify.** You need to deploy PocketBase separately on one of these platforms:

- **Railway** (Recommended - Easy setup)
- **Render** (Free tier available)
- **DigitalOcean App Platform**
- **Fly.io**
- **Any VPS** (DigitalOcean, AWS EC2, etc.)

Once PocketBase is deployed, you'll get a URL like:
- `https://your-pocketbase.railway.app` or
- `https://your-pocketbase.onrender.com`

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **GitHub/GitLab/Bitbucket Repository**: Your code should be in a Git repository
3. **PocketBase Deployed**: PocketBase backend must be running and accessible via HTTPS

## Step 1: Deploy PocketBase (Required First)

**Choose one of the following options:**

### Option A: AWS (Recommended for Production)

See **[AWS_POCKETBASE_DEPLOYMENT.md](./AWS_POCKETBASE_DEPLOYMENT.md)** for detailed instructions.

**Quick start:**
1. Launch EC2 instance (Ubuntu 22.04)
2. Run the setup script: `bash aws-ec2-setup.sh`
3. Configure Nginx and SSL
4. Access PocketBase at your domain

**Benefits:**
- Full control and customization
- Cost-effective (t3.micro is free tier eligible)
- Scalable and production-ready
- Integrated with AWS ecosystem

### Option B: Railway (Easy Setup)

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add a new service → "Empty Service"
5. Add the following to your `railway.json` or configure in Railway dashboard:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.pocketbase"
  },
  "deploy": {
    "startCommand": "./pocketbase serve",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

6. Create `Dockerfile.pocketbase` in root:

```dockerfile
FROM ghcr.io/muchobien/pocketbase:0.22.27
EXPOSE 8090
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
```

7. Set environment variables in Railway:
   - `PB_ENCRYPTION_KEY` (generate a secure 32-character key)
8. Deploy and note the URL (e.g., `https://your-app.railway.app`)

### Option B: Render

1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your repository
4. Configure:
   - **Name**: `restaurant-pocketbase`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `Dockerfile.pocketbase` (create as above)
   - **Port**: `8090`
5. Set environment variables:
   - `PB_ENCRYPTION_KEY`
6. Deploy and note the URL

### Option C: Manual VPS Setup

```bash
# SSH into your VPS
ssh user@your-server.com

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Run PocketBase
docker run -d \
  --name pocketbase \
  -p 8090:8090 \
  -v /path/to/pb_data:/pb/pb_data \
  -e PB_ENCRYPTION_KEY=your-32-char-key \
  ghcr.io/muchobien/pocketbase:0.22.27

# Set up Nginx reverse proxy for HTTPS
# (Use Let's Encrypt for SSL certificate)
```

## Step 2: Set Up PocketBase

1. Access your deployed PocketBase admin UI: `https://your-pocketbase-url/_/`
2. Create an admin account (remember the credentials!)
3. Create all collections (use the scripts in `pocketbase/scripts/`)
4. Run seed data: `node pocketbase/scripts/seed.js` (update the URL in the script first)

## Step 3: Deploy Customer Web App to Netlify

1. **Go to Netlify Dashboard** → "Add new site" → "Import an existing project"
2. **Connect to Git** and select your repository
3. **Configure build settings**:
   - **Base directory**: `apps/customer-web`
   - **Build command**: `cd ../.. && npm install && npm run build --filter=@restaurant/customer-web`
   - **Publish directory**: `apps/customer-web/.next`
4. **Set Environment Variables** (Site settings → Environment variables):
   ```
   POCKETBASE_URL=https://your-pocketbase-url
   PB_ADMIN_EMAIL=your-admin-email@example.com
   PB_ADMIN_PASSWORD=your-admin-password
   NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-url
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id (optional)
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret (optional)
   RAZORPAY_WEBHOOK_SECRET=your-webhook-secret (optional)
   ```
5. **Deploy!** Netlify will build and deploy your app
6. **Note the URL**: You'll get something like `https://your-customer-app.netlify.app`

## Step 4: Deploy Backoffice App to Netlify

1. **Create a new site** in Netlify (or use a subdomain)
2. **Connect to the same Git repository**
3. **Configure build settings**:
   - **Base directory**: `apps/backoffice` (IMPORTANT: Set this in Netlify UI)
   - **Build command**: `cd ../.. && npm install && npm run build --filter=@restaurant/backoffice`
   - **Publish directory**: `apps/backoffice/.next`
   - **Note**: The `netlify.toml` file in `apps/backoffice/` will be automatically detected
4. **Set Environment Variables**:
   ```
   POCKETBASE_URL=https://your-pocketbase-url
   PB_ADMIN_EMAIL=your-admin-email@example.com
   PB_ADMIN_PASSWORD=your-admin-password
   NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-url
   ```
5. **Deploy!**

## Step 5: Update CORS Settings in PocketBase

1. Go to your PocketBase admin UI
2. Navigate to Settings → API
3. Add your Netlify domains to allowed origins:
   - `https://your-customer-app.netlify.app`
   - `https://your-backoffice-app.netlify.app`
   - `http://localhost:3000` (for local development)
   - `http://localhost:3001` (for local development)

## Step 6: Custom Domains (Optional)

### For Customer Web:
1. In Netlify dashboard → Site settings → Domain management
2. Add your custom domain (e.g., `menu.yourrestaurant.com`)
3. Update DNS records as instructed by Netlify

### For Backoffice:
1. Add a subdomain (e.g., `admin.yourrestaurant.com`)
2. Update DNS records

## Environment Variables Summary

### Customer Web (Netlify)
```
POCKETBASE_URL=https://your-pocketbase-url
PB_ADMIN_EMAIL=your-admin-email
PB_ADMIN_PASSWORD=your-admin-password
NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-url
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-key (optional)
RAZORPAY_KEY_SECRET=your-secret (optional)
RAZORPAY_WEBHOOK_SECRET=your-secret (optional)
```

### Backoffice (Netlify)
```
POCKETBASE_URL=https://your-pocketbase-url
PB_ADMIN_EMAIL=your-admin-email
PB_ADMIN_PASSWORD=your-admin-password
NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-url
```

### PocketBase (Railway/Render/VPS)
```
PB_ENCRYPTION_KEY=your-32-character-encryption-key
```

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure `turbo.json` is configured correctly
- Check Netlify build logs for specific errors

### API Errors (404/500)
- Verify `POCKETBASE_URL` is correct and accessible
- Check PocketBase CORS settings
- Ensure PocketBase collections are created
- Verify admin credentials are correct

### Images Not Loading
- Check `NEXT_PUBLIC_POCKETBASE_URL` is set correctly
- Verify PocketBase file serving is enabled
- Check image URLs in browser console

### Authentication Issues
- Verify `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` match your PocketBase admin account
- Check PocketBase logs for authentication errors
- Ensure PocketBase is accessible from Netlify's servers

## Quick Deploy Commands

If you prefer CLI:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy customer-web
cd apps/customer-web
netlify deploy --prod

# Deploy backoffice
cd ../backoffice
netlify deploy --prod
```

## Post-Deployment Checklist

- [ ] PocketBase is accessible via HTTPS
- [ ] PocketBase admin account created
- [ ] All collections created in PocketBase
- [ ] Seed data loaded
- [ ] CORS configured in PocketBase
- [ ] Environment variables set in both Netlify sites
- [ ] Customer web app accessible
- [ ] Backoffice app accessible
- [ ] Test login on both apps
- [ ] Test order creation
- [ ] Test image uploads
- [ ] Custom domains configured (if applicable)

## Support

If you encounter issues:
1. Check Netlify build logs
2. Check PocketBase logs
3. Verify all environment variables are set
4. Test PocketBase URL directly in browser
5. Check browser console for errors


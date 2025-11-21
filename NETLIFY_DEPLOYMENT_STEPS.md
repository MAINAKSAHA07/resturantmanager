# Netlify Deployment Steps

## Prerequisites
1. Netlify account (sign up at https://netlify.com)
2. Git repository connected to GitHub/GitLab/Bitbucket
3. PocketBase backend deployed (see AWS_POCKETBASE_DEPLOYMENT.md)

## Step 1: Deploy Customer Web App

### Option A: Via Netlify Dashboard (Recommended)

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Click "Add new site"** → **"Import an existing project"**
3. **Connect to Git** and select your repository: `https://github.com/MAINAKSAHA07/resturantmanager`
4. **Configure build settings**:
   - **Base directory**: `apps/customer-web`
   - **Build command**: `cd ../.. && npm install && npm run build --filter=@restaurant/customer-web && cd apps/customer-web && ln -sf ../../node_modules node_modules 2>/dev/null || true`
   - **Publish directory**: `apps/customer-web/.next`
   - **Note**: The `netlify.toml` file will override these settings
5. **Set Environment Variables** (Site settings → Environment variables):
   ```
   POCKETBASE_URL=https://your-pocketbase-url.com
   PB_ADMIN_EMAIL=your-admin-email@example.com
   PB_ADMIN_PASSWORD=your-admin-password
   NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-url.com
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id (optional)
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret (optional)
   RAZORPAY_WEBHOOK_SECRET=your-webhook-secret (optional)
   ```
6. **Deploy!** Netlify will build and deploy your app
7. **Note the URL**: You'll get something like `https://restaurant-customer-web.netlify.app`

### Option B: Via Netlify CLI

```bash
cd apps/customer-web

# Create a new site
netlify sites:create --name restaurant-customer-web

# Link to the site
netlify link

# Set environment variables
netlify env:set POCKETBASE_URL "https://your-pocketbase-url.com"
netlify env:set PB_ADMIN_EMAIL "your-admin-email@example.com"
netlify env:set PB_ADMIN_PASSWORD "your-admin-password"
netlify env:set NEXT_PUBLIC_POCKETBASE_URL "https://your-pocketbase-url.com"

# Deploy
netlify deploy --prod
```

## Step 2: Deploy Backoffice App

### Option A: Via Netlify Dashboard (Recommended)

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Click "Add new site"** → **"Import an existing project"**
3. **Connect to the same Git repository**: `https://github.com/MAINAKSAHA07/resturantmanager`
4. **Configure build settings**:
   - **Base directory**: `apps/backoffice`
   - **Build command**: `cd ../.. && npm install && npm run build --filter=@restaurant/backoffice && cd apps/backoffice && ln -sf ../../node_modules node_modules 2>/dev/null || true`
   - **Publish directory**: `apps/backoffice/.next`
5. **Set Environment Variables**:
   ```
   POCKETBASE_URL=https://your-pocketbase-url.com
   PB_ADMIN_EMAIL=your-admin-email@example.com
   PB_ADMIN_PASSWORD=your-admin-password
   NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-url.com
   ```
6. **Deploy!**
7. **Note the URL**: You'll get something like `https://restaurant-backoffice.netlify.app`

### Option B: Via Netlify CLI

```bash
cd apps/backoffice

# Create a new site
netlify sites:create --name restaurant-backoffice

# Link to the site
netlify link

# Set environment variables
netlify env:set POCKETBASE_URL "https://your-pocketbase-url.com"
netlify env:set PB_ADMIN_EMAIL "your-admin-email@example.com"
netlify env:set PB_ADMIN_PASSWORD "your-admin-password"
netlify env:set NEXT_PUBLIC_POCKETBASE_URL "https://your-pocketbase-url.com"

# Deploy
netlify deploy --prod
```

## Step 3: Configure PocketBase CORS

1. Go to your PocketBase admin UI: `https://your-pocketbase-url.com/_/`
2. Navigate to **Settings** → **API**
3. Add your Netlify domains to allowed origins:
   - `https://restaurant-customer-web.netlify.app`
   - `https://restaurant-backoffice.netlify.app`
   - `http://localhost:3000` (for local development)
   - `http://localhost:3001` (for local development)

## Step 4: Test the Deployment

1. **Customer Web**: Visit `https://restaurant-customer-web.netlify.app`
   - Should show tenant selection page
   - Should be able to browse menu
   - Should be able to place orders

2. **Backoffice**: Visit `https://restaurant-backoffice.netlify.app`
   - Should show login page
   - Should be able to login and access dashboard
   - Should see orders and KDS

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Verify all environment variables are set
- Ensure PocketBase is accessible from Netlify's servers

### API Errors
- Verify `POCKETBASE_URL` is correct and accessible
- Check PocketBase CORS settings
- Verify admin credentials are correct

### Images Not Loading
- Check `NEXT_PUBLIC_POCKETBASE_URL` is set correctly
- Verify PocketBase file serving is enabled
- Check image URLs in browser console

## Custom Domains (Optional)

### For Customer Web:
1. In Netlify dashboard → Site settings → Domain management
2. Add your custom domain (e.g., `menu.yourrestaurant.com`)
3. Update DNS records as instructed by Netlify

### For Backoffice:
1. Add a subdomain (e.g., `admin.yourrestaurant.com`)
2. Update DNS records


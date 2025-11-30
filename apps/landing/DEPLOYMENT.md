# Netlify Deployment Guide for Landing Page

## Prerequisites
- Netlify account
- Repository connected to Netlify

## Deployment Steps

### Option 1: Deploy via Netlify UI

1. **Go to Netlify Dashboard**
   - Visit https://app.netlify.com
   - Select your site (or create a new site)

2. **Configure Site Settings**
   - Go to **Site settings** → **Build & deploy**
   - Set the following:
     - **Base directory**: `apps/landing`
     - **Build command**: `cd ../.. && npm install --legacy-peer-deps && npx turbo run build --filter=@restaurant/landing`
     - **Publish directory**: `.next`

3. **Environment Variables** (if needed)
   - Go to **Site settings** → **Environment variables**
   - Add:
     - `NODE_VERSION`: `20`
     - `NPM_FLAGS`: `--legacy-peer-deps`
     - `NEXT_TELEMETRY_DISABLED`: `1`

4. **Deploy**
   - Click **Trigger deploy** → **Deploy site**
   - Or push to your connected branch

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Navigate to landing app directory
cd apps/landing

# Initialize and deploy
netlify init
netlify deploy --prod
```

### Option 3: Automatic Deployment (Recommended)

The `netlify.toml` file is already configured. Simply:

1. **Connect Repository to Netlify**
   - In Netlify Dashboard, go to **Add new site** → **Import an existing project**
   - Connect your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository

2. **Configure Build Settings**
   - Netlify will automatically detect `netlify.toml` in the `apps/landing` directory
   - Or manually set:
     - **Base directory**: `apps/landing`
     - **Build command**: `cd ../.. && npm install --legacy-peer-deps && npx turbo run build --filter=@restaurant/landing`
     - **Publish directory**: `.next`

3. **Deploy**
   - Netlify will automatically deploy on every push to your main branch

## Custom Domain

To use `resturantmanager.netlify.app`:

1. Go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Enter `resturantmanager.netlify.app` (or your custom domain)
4. Follow the DNS configuration instructions

## Troubleshooting

### Build Fails
- Ensure Node.js version is 20
- Check that all dependencies are installed
- Verify turbo.json configuration

### 404 Errors
- Ensure `@netlify/plugin-nextjs` is installed
- Check that `output: 'standalone'` is commented out in `next.config.js`

### D3 Visualizations Not Rendering
- Ensure all D3 components are client-side only (`'use client'`)
- Check browser console for errors

## Notes

- The landing page is a standalone Next.js app
- It doesn't require backend connections
- All visualizations are client-side rendered
- The site is fully static after build


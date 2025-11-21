# Setup Guide

## Quick Start

### 1. Start PocketBase

```bash
docker-compose up -d pocketbase
```

Wait for PocketBase to be ready (check http://localhost:8090/_/)

### 2. Create Admin Account

**First time setup:**
1. Open http://localhost:8090/_/ in your browser
2. You'll be prompted to create an admin account
3. Enter your email and password (remember these!)

**If admin already exists:**
- Use your existing admin credentials

### 3. Set Environment Variables

Create a `.env` file in the root directory:

```env
# PocketBase
POCKETBASE_URL=http://localhost:8090
PB_ADMIN_EMAIL=your-admin-email@example.com
PB_ADMIN_PASSWORD=your-admin-password
PB_ENCRYPTION_KEY=changeme-32-characters-long-key

# Razorpay (optional for now)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Brand
DEFAULT_BRAND_KEY=saffron
```

**Important:** The `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` must match the admin account you created in PocketBase!

### 4. Create Collections

You need to create the collections in PocketBase. You can either:

**Option A: Use the Admin UI**
1. Go to http://localhost:8090/_/
2. Navigate to Collections
3. Create each collection manually using the schema from `pocketbase/migrations/001_create_collections.js`

**Option B: Use a migration script (if available)**
```bash
node pocketbase/migrations/apply.js
```

### 5. Seed Data

```bash
npm run seed
```

Or:
```bash
node pocketbase/scripts/seed.js
```

**Note:** The seed script will use the admin credentials from your `.env` file.

### 6. Start Development Servers

```bash
npm run dev
```

Or start individually:
```bash
# Terminal 1: Customer web
cd apps/customer-web
npm run dev

# Terminal 2: Back office
cd apps/backoffice
npm run dev
```

## Troubleshooting

### Admin Authentication Failed

If you see "Admin authentication failed" errors:

1. **Check PocketBase is running:**
   ```bash
   docker-compose ps
   ```
   Should show `restaurant-pb` as running

2. **Verify admin account exists:**
   - Go to http://localhost:8090/_/
   - Try logging in with your credentials
   - If you can't log in, the account doesn't exist or password is wrong

3. **Check environment variables:**
   - Make sure `.env` file exists in root directory
   - Verify `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` are correct
   - Restart the Next.js dev server after changing `.env`

4. **Create admin account if missing:**
   - Go to http://localhost:8090/_/
   - If prompted, create a new admin account
   - Update your `.env` file with the credentials

### Collections Not Found (404 errors)

1. Make sure collections are created in PocketBase
2. Check collection names match the code (e.g., `orders` not `order`, `tables` not `table`)
3. Verify access rules are set correctly

### Port Already in Use

If ports 3000, 3001, or 8090 are already in use:

1. Stop other services using those ports
2. Or change ports in:
   - `docker-compose.yml` for PocketBase (8090)
   - `apps/*/package.json` for Next.js apps (3000, 3001)

## Next Steps

After setup is complete:
- Access customer web: http://localhost:3000
- Access back office: http://localhost:3001
- Access PocketBase admin: http://localhost:8090/_/


# Restaurant Manager - Multi-Brand Platform

A production-ready, multi-brand restaurant management system built with PocketBase, Next.js, and TypeScript. Features include KDS (Kitchen Display System), Razorpay payments, GST invoicing, reservations, and realtime order tracking.

## Features

### v1 Scope
- ✅ Multi-brand, multi-location support with subdomain routing
- ✅ Customer web app: menu browsing, cart, checkout, order tracking
- ✅ Razorpay payment integration with webhook verification
- ✅ Kitchen Display System (KDS) with realtime updates
- ✅ Reservations with floor plan management
- ✅ India GST invoice generation (CGST/SGST/IGST)
- ✅ Back office admin portal
- ✅ Realtime order status updates
- ✅ Seed data for quick demo

### Non-goals (v1)
- Printers (planned for v2)
- Delivery management
- Loyalty programs
- Coupons
- Deep inventory management

## Tech Stack

- **Backend**: PocketBase (latest stable), SQLite
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Payments**: Razorpay
- **Infrastructure**: Docker Compose, Nginx reverse proxy
- **Monorepo**: Turborepo

## Project Structure

```
.
├── apps/
│   ├── customer-web/     # Customer-facing Next.js app
│   └── backoffice/        # Admin/KDS Next.js app
├── packages/
│   ├── lib/              # Shared utilities (PB client, money, GST, etc.)
│   └── ui/               # Shared UI components
├── pocketbase/
│   ├── migrations/       # Collection schema definitions
│   ├── hooks/            # PocketBase hooks (order lifecycle)
│   └── scripts/          # Seed script
├── ops/
│   └── nginx/            # Nginx configuration
└── docker-compose.yml    # Docker services

```

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Razorpay account (test mode keys)

## Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd "Resturant manager"
npm install
```

### 2. Create PocketBase Admin Account

**First time setup:**
1. Start PocketBase: `docker-compose up -d pocketbase`
2. Open http://localhost:8090/_/ in your browser
3. Create an admin account (remember the email and password!)

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# PocketBase (REQUIRED - must match your admin account!)
POCKETBASE_URL=http://localhost:8090
PB_ADMIN_EMAIL=your-admin-email@example.com
PB_ADMIN_PASSWORD=your-admin-password
PB_ENCRYPTION_KEY=changeme-32-characters-long-key

# Razorpay (optional for development)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Brand
DEFAULT_BRAND_KEY=saffron
```

**Important:** `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` must match the admin account you created in PocketBase!

**apps/customer-web/.env.local:**
```env
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
```

**apps/backoffice/.env.local:**
```env
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```

### 4. Start PocketBase (if not already running)

```bash
docker-compose up -d pocketbase
```

Wait for PocketBase to start (check http://localhost:8090/_/).

### 5. Create Collections

PocketBase collections need to be created manually via the Admin UI or API. The schema definitions are in `pocketbase/migrations/001_create_collections.js`.

**Via Admin UI:**
1. Go to http://localhost:8090/_/
2. Create admin account
3. Navigate to Collections
4. Create each collection with the schema from the migration file

**Via API (automated):**
A migration runner can be implemented using PocketBase Admin API.

### 6. Seed Data

```bash
make seed
```

Or manually:
```bash
node pocketbase/scripts/seed.js
```

This creates:
- Two demo brands: `saffron` and `ember`
- Locations with GSTIN
- Menu categories and items
- Tables with floor plan positions
- Demo customers

### 7. Start Development Servers

```bash
make dev
```

Or manually:
```bash
# Terminal 1: Customer web
cd apps/customer-web
npm run dev

# Terminal 2: Back office
cd apps/backoffice
npm run dev
```

### 7. Access Applications

- **Customer Web**: http://localhost:3000 (or via subdomain: http://saffron.localhost:3000)
- **Back Office**: http://localhost:3001
- **PocketBase Admin**: http://localhost:8090/_/

## Docker Deployment

### Development

```bash
make start
```

### Production

1. Update environment variables in `docker-compose.yml`
2. Build and start:

```bash
docker-compose build
docker-compose up -d
```

### Backup

Run nightly backups:

```bash
make backup
```

Or schedule via cron:
```bash
0 2 * * * cd /path/to/project && make backup
```

## PocketBase Setup

### Collections

The following collections are required:

1. `tenant` - Brand/tenant information
2. `location` - Restaurant locations
3. `role` - User roles
4. `user` - Staff users (auth collection)
5. `customer` - Customer users (auth collection)
6. `menuCategory` - Menu categories
7. `menuItem` - Menu items
8. `optionGroup` - Item customization groups
9. `optionValue` - Option values
10. `table` - Restaurant tables
11. `reservation` - Table reservations
12. `order` - Customer orders
13. `orderItem` - Order line items
14. `kdsTicket` - KDS tickets

### Access Rules

All collections have tenant-scoped access rules. See `pocketbase/migrations/001_create_collections.js` for detailed rules.

### Hooks

- `order` beforeUpdate: Validates status transitions and updates timestamps
- `order` afterUpdate: Creates KDS ticket when order is accepted

## Razorpay Integration

### Test Mode

1. Get test keys from Razorpay Dashboard
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
3. Configure webhook URL: `http://your-domain.com/api/payments/razorpay/webhook`
4. Set `RAZORPAY_WEBHOOK_SECRET`

### Payment Flow

1. Customer creates order → `POST /api/orders/create`
2. Create Razorpay order → `POST /api/payments/razorpay/order`
3. Customer pays via Razorpay Checkout
4. Capture payment → `POST /api/payments/razorpay/capture`
5. Webhook verifies and updates order status

## GST Calculation

GST is calculated based on:
- **Same state** (customer state = location state): CGST + SGST (split equally)
- **Different state**: IGST (full amount)

Tax rates are per menu item. See `packages/lib/src/gst.ts` for implementation.

## Subdomain Routing

- Customer web: `<brand>.example.com` → `apps/customer-web`
- Back office: `<brand>-admin.example.com` → `apps/backoffice`
- API: `api.example.com` → PocketBase

For local development, use `/etc/hosts`:
```
127.0.0.1 saffron.localhost
127.0.0.1 saffron-admin.localhost
127.0.0.1 ember.localhost
127.0.0.1 ember-admin.localhost
```

## API Endpoints

### Customer Web

- `GET /` - Menu listing
- `GET /item/[id]` - Item details
- `GET /cart` - Shopping cart
- `GET /checkout` - Checkout page
- `GET /order/[id]` - Order tracking
- `GET /reservations` - Reservations

### Back Office

- `GET /dashboard` - Dashboard
- `GET /orders` - Order management
- `GET /kds` - Kitchen Display System
- `GET /reservations` - Reservation management
- `GET /floorplan` - Floor plan editor
- `GET /reports/daily-sales` - Daily sales report
- `GET /reports/gst-summary` - GST summary

## Development

### Adding New Features

1. Update PocketBase schema if needed
2. Add API routes in Next.js apps
3. Create UI components
4. Update shared utilities in `packages/lib`

### Testing

```bash
# Unit tests (when implemented)
npm test

# E2E tests (when implemented)
npm run test:e2e
```

## Troubleshooting

### Admin Authentication Failed

If you see "Admin authentication failed" errors:

1. **Verify admin account exists:**
   - Go to http://localhost:8090/_/
   - Try logging in with your credentials
   - If login fails, create a new admin account or reset password

2. **Check environment variables:**
   - Ensure `.env` file exists in root directory
   - Verify `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` match your PocketBase admin account
   - Restart Next.js dev server after changing `.env`

3. **See SETUP.md for detailed troubleshooting**

### PocketBase not starting

- Check Docker logs: `docker-compose logs pocketbase`
- Ensure port 8090 is not in use
- Verify `pb_data` directory permissions

### Collections not found

- Run seed script: `make seed`
- Verify collections exist in PocketBase Admin UI
- Check access rules are set correctly

### Payment issues

- Verify Razorpay keys are set correctly
- Check webhook URL is accessible
- Review webhook logs in Razorpay Dashboard

## License

[Your License Here]

## Support

[Your Support Information Here]




# Customer Web App Flow

## Overview
The customer web app is a multi-tenant restaurant ordering system where customers can browse menus, place orders, and track their orders. Each restaurant (tenant) has a unique URL.

## Access Methods

### 1. **Tenant-Specific URL** (Primary Method)
- **Format**: `https://{customer-web-domain}/{tenantKey}`
- **Example**: `https://restaurant-customer-web.netlify.app/saffron`
- **Flow**:
  1. Customer visits `/{tenantKey}` (e.g., `/saffron`)
  2. Route handler (`apps/customer-web/src/app/[tenantKey]/page.tsx`) validates tenant exists
  3. Sets `selected_tenant` cookie server-side
  4. Redirects to menu page (`/`)

### 2. **Query Parameter**
- **Format**: `https://{customer-web-domain}/?tenant={tenantKey}`
- **Example**: `https://restaurant-customer-web.netlify.app/?tenant=saffron`
- **Flow**:
  1. Customer visits with `?tenant={key}` query param
  2. Menu page reads query param (highest priority)
  3. Sets cookie via `TenantSelector` component
  4. Displays menu for that tenant

### 3. **Cookie-Based** (Persistent)
- If customer previously selected a tenant, cookie persists
- Menu page reads `selected_tenant` cookie
- No redirect needed - menu loads directly

### 4. **Subdomain-Based** (Future/Alternative)
- Middleware extracts subdomain from hostname
- Example: `saffron.example.com` → extracts `saffron`
- Falls back if no query param or cookie

### 5. **Tenant Selection Page**
- If no tenant is detected, redirects to `/tenants`
- Shows list of all available restaurants
- Customer clicks on a restaurant card
- Redirects to `/?tenant={key}`

## Tenant Resolution Priority

The menu page (`apps/customer-web/src/app/page.tsx`) resolves tenant in this order:
1. **Query parameter** (`?tenant={key}`) - Highest priority
2. **Cookie** (`selected_tenant`) - Persistent selection
3. **Subdomain** (extracted from hostname) - Domain-based routing
4. **Redirect to `/tenants`** - If none found

## Menu Display Flow

1. **Tenant Resolution**: Determines which tenant's menu to show
2. **Menu Fetching** (`getMenu()` function):
   - Connects to PocketBase
   - Fetches tenant by key
   - Gets locations for that tenant
   - Fetches menu categories and items
   - Filters by tenant, location, and availability
   - Deduplicates items
3. **Table Context**: Reads `tableContext` cookie if customer scanned QR code
4. **Display**: Shows menu with categories, items, prices, and table indicator (if applicable)

## QR Code Flow

### QR Code Format
- **URL**: `{customerUrl}/t/{qrToken}`
- **Example**: `https://restaurant-customer-web.netlify.app/saffron/t/abc123xyz`

### Flow When QR is Scanned:
1. Customer scans QR code → Opens `/{tenantKey}/t/{qrToken}`
2. **QR Route Handler** (`apps/customer-web/src/app/t/[qrToken]/page.tsx`):
   - Calls `/api/table-from-qr` with `qrToken`
   - API resolves token to table, tenant, location
   - Returns: `tenantKey`, `tenantId`, `locationId`, `tableId`, `tableName`
3. **Cookie Setting**:
   - Sets `tableContext` cookie with table info (24-hour expiry)
   - Sets `selected_tenant` cookie
   - Dispatches `tableContextUpdated` event
4. **Redirect**: Redirects to `/{tenantKey}` (tenant-specific URL)
5. **Menu Display**:
   - Menu page reads `tableContext` cookie
   - Displays "🪑 Table: {Table Name}" badge in header
   - Navbar shows table indicator
   - Menu items are filtered by tenant

## Order Placement Flow

### Adding Items to Cart
1. Customer browses menu
2. Clicks on menu item → Goes to `/item/{itemId}`
3. Selects quantity, options, adds to cart
4. Cart stored in `localStorage`

### Checkout Process
1. Customer clicks "Checkout" from cart
2. **Checkout Page** (`apps/customer-web/src/app/checkout/page.tsx`):
   - Reads cart from `localStorage`
   - Reads `tableContext` from cookies
   - Displays order summary
   - Customer enters details (if not logged in)
   - Applies coupon (optional)
3. **Order Creation** (`/api/orders/create`):
   - Validates items
   - Gets tenant from cookie/hostname
   - Calculates prices, GST, discounts
   - **Table Context Handling**:
     - Reads `tableContext` from request body or cookie
     - Validates table belongs to current tenant/location
     - Sets `channel: 'dine_in'`, `tableId`, `tableLabel` if valid
     - Otherwise defaults to `channel: 'pickup'`
   - Creates order in PocketBase
   - Creates order items
   - Returns order ID and total

### Payment (Razorpay)
1. After order creation, redirects to Razorpay
2. Customer completes payment
3. Payment webhook updates order status
4. Redirects to order tracking page

## Order Tracking

- **Route**: `/order/{orderId}`
- Fetches order details from `/api/orders/{id}`
- Shows order status, items, total
- Updates in real-time as order progresses

## Key Features

### Multi-Tenant Support
- Each restaurant has unique URL
- Menu, items, categories filtered by tenant
- Orders associated with tenant

### Table-Aware Ordering
- QR codes link orders to specific tables
- Table context persists via cookies
- Orders show table number in backoffice

### Persistent Selection
- Tenant selection saved in cookie (30 days)
- Table context saved in cookie (24 hours)
- Cart saved in `localStorage`

### Responsive Design
- Works on mobile, tablet, desktop
- Touch-friendly for restaurant use

## API Endpoints Used

- `GET /api/tenants` - List all tenants
- `POST /api/table-from-qr` - Resolve QR token to table
- `GET /api/menu-items` - Get menu items (if needed)
- `POST /api/orders/create` - Create new order
- `GET /api/orders/{id}` - Get order details
- `GET /api/my-orders` - Get customer's orders
- `POST /api/coupons/validate` - Validate coupon code

## State Management

- **Server-Side**: Tenant selection via cookies
- **Client-Side**: Cart in `localStorage`, table context in cookies
- **Real-Time**: Order status updates via polling

## Error Handling

- Invalid tenant → Redirects to `/tenants`
- Invalid QR code → Shows error message
- Order creation failure → Shows error, keeps cart
- Network errors → Graceful degradation





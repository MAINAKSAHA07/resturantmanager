# Restaurant Manager

A comprehensive, multi-tenant restaurant management system built with Next.js. It features a customer-facing web application, a powerful back-office management interface, and a marketing landing page. The system supports order management, table management with interactive floor plans, kitchen display system (KDS), menu management, and payment processing.

## 🚀 Features

### Customer Web Application (`apps/customer-web`)
- **Multi-Tenant Support**: Dynamic branding and menu based on the selected restaurant/tenant.
- **Digital Menu**: Browse categories and items with rich images and descriptions.
- **Interactive Shopping Cart**: 
  - Real-time total calculation with GST (CGST/SGST/IGST).
  - **Coupon System**: Apply discount codes with validation.
- **Order Placement**: Seamless flow for Dine-in (QR code) and Takeaway orders.
- **Payment Integration**: Secure payments via Razorpay.
- **User Experience**: 
  - **Floating Food Emojis**: Playful interactive elements.
  - Responsive design for mobile and desktop.
- **Profile Management**: Customer order history and profile settings.

### Back Office Application (`apps/backoffice`)
- **Dashboard**: Real-time analytics and sales overview.
- **Floor Plan Management**: 
  - **Drag-and-Drop Interface**: Visually arrange tables.
  - **Real-time Status**: See table status (Available, Seated, Active Order) instantly.
  - **Direct Ordering**: Create orders and take payments directly from the floor plan view.
- **Order Management**: 
  - Comprehensive list view with filters (Dine-in, Delivery, All).
  - Detailed order breakdown with status tracking.
- **Menu Management**: Create and update items, categories, and availability.
- **Kitchen Display System (KDS)**: Real-time ticket view for kitchen staff.
- **Multi-Location Support**: Manage multiple branches under a single tenant.
- **User Management**: Role-Based Access Control (RBAC) for Admin, Manager, and Staff.

### Landing Page (`apps/landing`)
- Marketing website to showcase the platform features.
- Responsive design with modern UI components.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom design tokens
- **Backend**: Next.js API Routes (Serverless functions)
- **Database**: PocketBase (SQLite-based, real-time subscriptions)
- **Payment**: Razorpay
- **Authentication**: PocketBase Auth (Email/Password, OAuth)
- **Monorepo Tooling**: TurboRepo
- **Containerization**: Docker, Docker Compose

## 📁 Project Structure

```
restaurant-manager/
├── apps/
│   ├── backoffice/          # Admin & Staff Dashboard
│   │   ├── src/app/         # App Router (Dashboard, Floorplan, Orders, etc.)
│   │   └── ...
│   ├── customer-web/        # Customer Ordering App
│   │   ├── src/app/         # App Router (Menu, Cart, Checkout, etc.)
│   │   └── ...
│   └── landing/             # Marketing Landing Page
│       └── ...
├── packages/
│   ├── lib/                 # Shared logic (Tax calc, formatters, types)
│   └── ui/                  # Shared React components (Buttons, Inputs, Cards)
├── pocketbase/
│   ├── pb_data/             # Database files (gitignored)
│   ├── migrations/          # Schema migrations
│   └── scripts/             # Maintenance scripts
├── docker-compose.yml       # Local development setup
└── turbo.json               # Monorepo configuration
```

## 📋 Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose (optional, for local DB)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd restaurant-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**

   Create `.env` in the root directory:
   ```env
   # PocketBase Configuration
   POCKETBASE_URL=http://localhost:8090
   PB_ADMIN_EMAIL=admin@example.com
   PB_ADMIN_PASSWORD=secure_password_here
   PB_ENCRYPTION_KEY=your_encryption_key_here

   # Razorpay Configuration
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

   Create `.env.local` in `apps/backoffice/` and `apps/customer-web/` with specific overrides if needed.

4. **Start PocketBase**
   ```bash
   # Using Docker
   docker-compose up -d pocketbase

   # OR Local Binary
   ./pocketbase serve
   ```

5. **Initialize Database**
   ```bash
   # Create collections and schema
   npm run pb:create-collections
   
   # Seed initial data (optional)
   npm run seed
   ```

## 🚀 Running the Project

### Development Mode
Start all applications (Backoffice, Customer, Landing) in parallel:
```bash
npm run dev
```
- **Customer Web**: http://localhost:3000
- **Back Office**: http://localhost:3001
- **Landing Page**: http://localhost:3002 (check console for port)
- **PocketBase Admin**: http://localhost:8090/_/

### Individual Apps
```bash
# Run only Customer App
cd apps/customer-web && npm run dev

# Run only Backoffice
cd apps/backoffice && npm run dev
```

## 🔐 Security & Multi-Tenancy

- **Middleware Protection**: Routes are protected via Next.js middleware checking for valid auth tokens.
- **Tenant Isolation**: 
  - Data is logically separated by `tenantId`.
  - Middleware ensures users/customers only access data for their specific context.
- **Secrets Management**: 
  - **NEVER** commit `.env` files.
  - Use environment variables for all sensitive keys (API keys, DB passwords).
  - The repository includes `.env.example` files for reference.

## 📦 Database Scripts

Useful scripts for maintaining the PocketBase instance:
```bash
npm run pb:migrate       # Run pending migrations
npm run pb:check-duplicate-menu # Check for data consistency
npm run pb:cleanup-duplicate-menu # Fix data consistency
```

## 📄 License

Proprietary software. All rights reserved.

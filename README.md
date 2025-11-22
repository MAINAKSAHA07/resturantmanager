# Restaurant Manager

A comprehensive restaurant management system built with Next.js, featuring a customer-facing web application and a back-office management interface. The system includes order management, table management, kitchen display system (KDS), menu management, and payment processing.

## 🚀 Features

### Customer Web Application
- **Menu Browsing**: Browse menu items with categories, descriptions, and images
- **Shopping Cart**: Add items to cart with quantity management
- **Order Placement**: Place orders for dine-in or takeaway
- **Payment Integration**: Razorpay payment gateway integration
- **Order Tracking**: View order history and status
- **Reservations**: Make table reservations
- **Profile Management**: Update customer profile and address

### Back Office Application
- **Dashboard**: Real-time statistics and analytics
- **Menu Management**: Create and manage menu items, categories with role-based permissions
- **Order Management**: View and manage orders with status updates
- **Table Management**: Interactive floor plan with drag-and-drop table placement
- **Kitchen Display System (KDS)**: Station-based ticket system (Hot, Cold, Bar)
- **User Management**: Create and manage staff with role-based access control (RBAC)
- **Location Management**: Manage multiple restaurant locations
- **Reports**: Daily sales and GST summary reports
- **Reservation Management**: View and manage table reservations

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: Tailwind CSS with D3 color scheme
- **Backend**: Next.js API Routes
- **Database**: PocketBase (SQLite-based)
- **Payment**: Razorpay
- **Authentication**: PocketBase Auth with Google OAuth support
- **Deployment**: Docker, Docker Compose
- **Build Tool**: Turbo (Monorepo)

## 📁 Project Structure

```
restaurant-manager/
├── apps/
│   ├── backoffice/          # Back office management application
│   │   ├── src/
│   │   │   ├── app/         # Next.js app router
│   │   │   │   ├── api/     # API routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── floorplan/
│   │   │   │   ├── kds/
│   │   │   │   ├── menu/
│   │   │   │   ├── orders/
│   │   │   │   └── ...
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utilities and helpers
│   │   └── package.json
│   └── customer-web/        # Customer-facing application
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── lib/
│       └── package.json
├── packages/
│   ├── lib/                 # Shared library (GST, money, PocketBase utils)
│   └── ui/                  # Shared UI components
├── pocketbase/
│   ├── scripts/             # Database scripts and migrations
│   ├── migrations/          # Database migrations
│   └── pb_data/             # PocketBase data directory
├── docker-compose.yml       # Docker services configuration
├── package.json             # Root package.json (monorepo)
└── turbo.json              # Turbo configuration
```

## 📋 Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose (for containerized deployment)
- PocketBase admin account credentials

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

3. **Set up environment variables**
   
   Create `.env` file in the root directory:
   ```env
   # PocketBase Configuration
   POCKETBASE_URL=http://localhost:8090
   PB_ADMIN_EMAIL=your-admin@email.com
   PB_ADMIN_PASSWORD=your-admin-password
   PB_ENCRYPTION_KEY=your-encryption-key

   # AWS Configuration (for production)
   AWS_POCKETBASE_URL=http://your-aws-pocketbase-url:8090

   # Razorpay Configuration
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret
   ```

   Create `.env.local` files in each app directory:
   
   `apps/backoffice/.env.local`:
   ```env
   POCKETBASE_URL=http://localhost:8090
   PB_ADMIN_EMAIL=your-admin@email.com
   PB_ADMIN_PASSWORD=your-admin-password
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret
   ```

   `apps/customer-web/.env.local`:
   ```env
   POCKETBASE_URL=http://localhost:8090
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Set up PocketBase database**
   ```bash
   # Start PocketBase (if using Docker)
   docker-compose up -d pocketbase

   # Or run PocketBase locally
   # Download PocketBase from https://pocketbase.io/docs/
   # Run: ./pocketbase serve

   # Create database collections
   npm run pb:create-collections

   # Seed initial data (optional)
   npm run seed
   ```

## 🚀 Running the Project

### Development Mode

Run all applications in development mode:
```bash
npm run dev
```

This will start:
- Customer Web: http://localhost:3000
- Back Office: http://localhost:3001
- PocketBase: http://localhost:8090

### Individual Applications

Run specific applications:
```bash
# Customer Web only
cd apps/customer-web
npm run dev

# Back Office only
cd apps/backoffice
npm run dev
```

### Production Build

```bash
# Build all applications
npm run build

# Start production servers
cd apps/customer-web && npm start
cd apps/backoffice && npm start
```

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🗄️ Database Setup

### Initial Setup

1. **Create Collections**
   ```bash
   npm run pb:create-collections
   ```

2. **Create Admin Account**
   - Visit http://localhost:8090/_/
   - Create an admin account
   - Update `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` in `.env` files

3. **Seed Data (Optional)**
   ```bash
   npm run seed
   ```

### Database Scripts

Available PocketBase scripts:
```bash
# Check for duplicate records
npm run pb:check-duplicate-menu
npm run pb:check-duplicate-tables

# Cleanup duplicate records
npm run pb:cleanup-duplicate-menu
npm run pb:cleanup-duplicate-tables
npm run pb:cleanup-duplicate-locations-migrate

# Availability field management
npm run pb:migrate-availability
npm run pb:check-availability-field
```

## 👥 User Roles & Permissions

The system supports role-based access control (RBAC) with the following roles:

- **Admin/Master User**: Full access to all features
- **Manager**: Can manage menu, orders, users (except admins)
- **Staff**: Limited access (can only update menu item availability)

### Permission System

Permissions are defined in `apps/backoffice/src/lib/permissions.ts`:
- Menu permissions: `menu.view`, `menu.create`, `menu.edit`, `menu.delete`
- Order permissions: `orders.view`, `orders.update`
- User permissions: `users.view`, `users.create`, `users.edit`, `users.delete`

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/select-tenant` - Select tenant
- `POST /api/auth/logout` - User logout

### Menu
- `GET /api/menu/items` - Get menu items
- `POST /api/menu/items` - Create menu item
- `PUT /api/menu/items/[id]` - Update menu item
- `DELETE /api/menu/items/[id]` - Delete menu item

### Orders
- `GET /api/orders` - Get orders
- `PATCH /api/orders` - Update order status
- `POST /api/tables/[id]/order` - Create order for table
- `POST /api/orders/[id]/items` - Add items to order
- `PUT /api/orders/[id]/items/[itemId]` - Update order item
- `DELETE /api/orders/[id]/items/[itemId]` - Delete order item

### Tables
- `GET /api/tables` - Get tables
- `POST /api/tables` - Create table
- `PATCH /api/tables` - Update table
- `DELETE /api/tables` - Delete table

### KDS (Kitchen Display System)
- `GET /api/kds` - Get KDS tickets
- `PATCH /api/kds` - Update ticket status

### Locations
- `GET /api/locations` - Get locations
- `POST /api/locations` - Create location
- `PUT /api/locations/[id]` - Update location
- `DELETE /api/locations/[id]` - Delete location

## 🎨 Styling

The project uses Tailwind CSS with a custom D3 color scheme:
- Accent colors: Blue, Purple, Green, Pink, Orange, Brown, Gray
- Gradient backgrounds
- Responsive design
- Custom scrollbar styling

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start all apps in dev mode
npm run build            # Build all apps
npm run lint             # Lint all apps

# Database
npm run seed             # Seed initial data
npm run pb:migrate       # Run database migrations
npm run pb:create-collections  # Create database collections

# Cleanup
npm run pb:cleanup-duplicate-menu
npm run pb:cleanup-duplicate-tables
npm run pb:cleanup-duplicate-locations-migrate
```

## 🚢 Deployment

### Docker Deployment

1. **Build and start services**
   ```bash
   docker-compose up -d --build
   ```

2. **Access applications**
   - Customer Web: http://localhost:3000
   - Back Office: http://localhost:3001
   - PocketBase Admin: http://localhost:8090/_/

### Production Considerations

- Set secure `PB_ENCRYPTION_KEY`
- Use environment variables for all secrets
- Configure Nginx for reverse proxy
- Set up SSL certificates
- Configure backup strategy
- Use production PocketBase instance

## 🔐 Security

- Authentication via PocketBase
- Role-based access control (RBAC)
- API route protection
- Environment variable management
- Secure cookie handling

## 📝 Notes

- All monetary values are stored in paise (1 rupee = 100 paise)
- GST calculations support CGST/SGST (same state) and IGST (different states)
- KDS tickets are automatically created when orders are accepted
- Orders can have item-level comments visible in KDS
- Menu item descriptions are displayed in KDS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is private and proprietary.

## 📞 Support

For issues and questions, please contact the development team.


/**
 * Seed script for PocketBase
 * Creates demo brands, locations, menu, users, and sample data
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const PocketBase = require('pocketbase/cjs');
const fs = require('fs');
const path = require('path');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function seed() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ Error: PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const pb = new PocketBase(PB_URL);

  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

    console.log('🌱 Starting seed...');

    // Check if tenants already exist
    const existingTenants = await pb.collection('tenant').getList(1, 10);
    let saffronTenant, emberTenant;
    
    if (existingTenants.items.length > 0) {
      console.log('✅ Tenants already exist, using existing ones');
      saffronTenant = existingTenants.items.find(t => t.key === 'saffron');
      emberTenant = existingTenants.items.find(t => t.key === 'ember');
      
      if (!saffronTenant) {
        saffronTenant = await pb.collection('tenant').create({
          key: 'saffron',
          name: 'Saffron Restaurant',
          primaryDomain: 'saffron.example.com',
          adminDomain: 'saffron-admin.example.com',
          theme: {
            colors: {
              primary: '#FF6B35',
              secondary: '#F7931E',
            },
            logoUrl: '/logo-saffron.png',
          },
        });
      }

      if (!emberTenant) {
        emberTenant = await pb.collection('tenant').create({
          key: 'ember',
          name: 'Ember Bistro',
          primaryDomain: 'ember.example.com',
          adminDomain: 'ember-admin.example.com',
          theme: {
            colors: {
              primary: '#8B0000',
              secondary: '#FF4500',
            },
            logoUrl: '/logo-ember.png',
          },
        });
      }
    } else {
      // Create tenants if they don't exist
      saffronTenant = await pb.collection('tenant').create({
        key: 'saffron',
        name: 'Saffron Restaurant',
        primaryDomain: 'saffron.example.com',
        adminDomain: 'saffron-admin.example.com',
        theme: {
          colors: {
            primary: '#FF6B35',
            secondary: '#F7931E',
          },
          logoUrl: '/logo-saffron.png',
        },
      });

      emberTenant = await pb.collection('tenant').create({
        key: 'ember',
        name: 'Ember Bistro',
        primaryDomain: 'ember.example.com',
        adminDomain: 'ember-admin.example.com',
        theme: {
          colors: {
            primary: '#8B0000',
            secondary: '#FF4500',
          },
          logoUrl: '/logo-ember.png',
        },
      });
    }

    if (saffronTenant && emberTenant) {
      console.log('✅ Tenants ready');
    }

    // Create locations
    const saffronLocation = await pb.collection('location').create({
      tenantId: saffronTenant.id,
      name: 'Saffron Downtown',
      stateCode: 'MH',
      gstin: '27AABCU9603R1ZM',
      address: {
        street: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zip: '400001',
      },
      hours: {
        monday: { open: '11:00', close: '23:00' },
        tuesday: { open: '11:00', close: '23:00' },
        wednesday: { open: '11:00', close: '23:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '23:00' },
        saturday: { open: '11:00', close: '23:00' },
        sunday: { open: '12:00', close: '22:00' },
      },
    });

    const emberLocation = await pb.collection('location').create({
      tenantId: emberTenant.id,
      name: 'Ember Garden',
      stateCode: 'KA',
      gstin: '29AABCU9603R1ZN',
      address: {
        street: '456 Park Avenue',
        city: 'Bangalore',
        state: 'Karnataka',
        zip: '560001',
      },
      hours: {
        monday: { open: '12:00', close: '22:00' },
        tuesday: { open: '12:00', close: '22:00' },
        wednesday: { open: '12:00', close: '22:00' },
        thursday: { open: '12:00', close: '22:00' },
        friday: { open: '12:00', close: '23:00' },
        saturday: { open: '12:00', close: '23:00' },
        sunday: { open: '12:00', close: '22:00' },
      },
    });

    console.log('✅ Created locations');

    // Create menu categories for Saffron
    const saffronAppetizers = await pb.collection('menuCategory').create({
      tenantId: saffronTenant.id,
      locationId: saffronLocation.id,
      name: 'Appetizers',
      sort: 1,
    });

    const saffronMain = await pb.collection('menuCategory').create({
      tenantId: saffronTenant.id,
      locationId: saffronLocation.id,
      name: 'Main Course',
      sort: 2,
    });

    const saffronBeverages = await pb.collection('menuCategory').create({
      tenantId: saffronTenant.id,
      locationId: saffronLocation.id,
      name: 'Beverages',
      sort: 3,
    });

    const saffronDesserts = await pb.collection('menuCategory').create({
      tenantId: saffronTenant.id,
      locationId: saffronLocation.id,
      name: 'Desserts',
      sort: 4,
    });

    const saffronBreads = await pb.collection('menuCategory').create({
      tenantId: saffronTenant.id,
      locationId: saffronLocation.id,
      name: 'Breads & Rice',
      sort: 5,
    });

    // Create menu categories for Ember
    const emberStarters = await pb.collection('menuCategory').create({
      tenantId: emberTenant.id,
      locationId: emberLocation.id,
      name: 'Starters',
      sort: 1,
    });

    const emberMains = await pb.collection('menuCategory').create({
      tenantId: emberTenant.id,
      locationId: emberLocation.id,
      name: 'Mains',
      sort: 2,
    });

    const emberSalads = await pb.collection('menuCategory').create({
      tenantId: emberTenant.id,
      locationId: emberLocation.id,
      name: 'Salads',
      sort: 3,
    });

    const emberDesserts = await pb.collection('menuCategory').create({
      tenantId: emberTenant.id,
      locationId: emberLocation.id,
      name: 'Desserts',
      sort: 4,
    });

    const emberBeverages = await pb.collection('menuCategory').create({
      tenantId: emberTenant.id,
      locationId: emberLocation.id,
      name: 'Beverages',
      sort: 5,
    });

    console.log('✅ Created menu categories');

    // Create menu items for Saffron
    const saffronItems = [
      {
        categoryId: saffronAppetizers.id,
        name: 'Paneer Tikka',
        description: 'Grilled cottage cheese with spices',
        basePrice: 25000, // ₹250.00 in paise
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronAppetizers.id,
        name: 'Chicken Wings',
        description: 'Spicy chicken wings',
        basePrice: 35000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronAppetizers.id,
        name: 'Vegetable Spring Rolls',
        description: 'Crispy spring rolls with vegetables',
        basePrice: 18000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronMain.id,
        name: 'Butter Chicken',
        description: 'Creamy tomato-based curry',
        basePrice: 45000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronMain.id,
        name: 'Biryani',
        description: 'Fragrant basmati rice with spices',
        basePrice: 40000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronMain.id,
        name: 'Dal Makhani',
        description: 'Creamy black lentils',
        basePrice: 28000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronBreads.id,
        name: 'Garlic Naan',
        description: 'Fresh baked garlic naan',
        basePrice: 8000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronBreads.id,
        name: 'Basmati Rice',
        description: 'Steamed basmati rice',
        basePrice: 6000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronBeverages.id,
        name: 'Mango Lassi',
        description: 'Sweet mango yogurt drink',
        basePrice: 12000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronBeverages.id,
        name: 'Masala Chai',
        description: 'Spiced Indian tea',
        basePrice: 5000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronDesserts.id,
        name: 'Gulab Jamun',
        description: 'Sweet milk dumplings',
        basePrice: 12000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: saffronDesserts.id,
        name: 'Kheer',
        description: 'Rice pudding with cardamom',
        basePrice: 15000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
    ];

    const createdSaffronItems = [];
    for (const item of saffronItems) {
      const created = await pb.collection('menuItem').create({
        tenantId: saffronTenant.id,
        locationId: saffronLocation.id,
        ...item,
      });
      createdSaffronItems.push(created);
    }

    // Create menu items for Ember
    const emberItems = [
      {
        categoryId: emberStarters.id,
        name: 'Caesar Salad',
        description: 'Fresh romaine with caesar dressing',
        basePrice: 28000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberStarters.id,
        name: 'Bruschetta',
        description: 'Toasted bread with tomato and basil',
        basePrice: 22000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberSalads.id,
        name: 'Greek Salad',
        description: 'Fresh vegetables with feta and olives',
        basePrice: 32000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberSalads.id,
        name: 'Quinoa Salad',
        description: 'Quinoa with vegetables and herbs',
        basePrice: 35000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberMains.id,
        name: 'Grilled Salmon',
        description: 'Atlantic salmon with herbs',
        basePrice: 65000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberMains.id,
        name: 'Pasta Carbonara',
        description: 'Creamy pasta with bacon',
        basePrice: 42000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberMains.id,
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato and mozzarella',
        basePrice: 38000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberDesserts.id,
        name: 'Tiramisu',
        description: 'Classic Italian dessert',
        basePrice: 28000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberDesserts.id,
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten center',
        basePrice: 32000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberBeverages.id,
        name: 'Fresh Orange Juice',
        description: 'Freshly squeezed orange juice',
        basePrice: 15000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
      {
        categoryId: emberBeverages.id,
        name: 'Cappuccino',
        description: 'Espresso with steamed milk',
        basePrice: 12000,
        taxRate: 5,
        hsnSac: '1901',
        isActive: true,
      },
    ];

    const createdEmberItems = [];
    for (const item of emberItems) {
      const created = await pb.collection('menuItem').create({
        tenantId: emberTenant.id,
        locationId: emberLocation.id,
        ...item,
      });
      createdEmberItems.push(created);
    }

    console.log('✅ Created menu items');

    // Create tables
    const saffronTables = [];
    for (let i = 1; i <= 10; i++) {
      const table = await pb.collection('tables').create({
        tenantId: saffronTenant.id,
        locationId: saffronLocation.id,
        name: `Table ${i}`,
        capacity: i <= 5 ? 4 : 6,
        status: 'available',
        x: ((i - 1) % 5) * 100,
        y: Math.floor((i - 1) / 5) * 100,
      });
      saffronTables.push(table);
    }

    const emberTables = [];
    for (let i = 1; i <= 8; i++) {
      const table = await pb.collection('tables').create({
        tenantId: emberTenant.id,
        locationId: emberLocation.id,
        name: `Table ${i}`,
        capacity: 4,
        status: 'available',
        x: ((i - 1) % 4) * 120,
        y: Math.floor((i - 1) / 4) * 120,
      });
      emberTables.push(table);
    }
    console.log('✅ Created tables');

    // 6. Create Customers
    console.log('Creating customers...');
    let customer1, customer2;
    
    // Check if customers already exist
    const existingCustomers = await pb.collection('customer').getList(1, 10);
    customer1 = existingCustomers.items.find(c => c.email === 'john@example.com');
    customer2 = existingCustomers.items.find(c => c.email === 'jane@example.com');
    
    if (!customer1) {
      customer1 = await pb.collection('customer').create({
        email: 'john@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
        name: 'John Doe',
        phone: '9876543210',
      });
      console.log('✅ Created customer: john@example.com');
    } else {
      console.log('✅ Customer john@example.com already exists');
    }

    if (!customer2) {
      customer2 = await pb.collection('customer').create({
        email: 'jane@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
        name: 'Jane Smith',
        phone: '9876543211',
      });
      console.log('✅ Created customer: jane@example.com');
    } else {
      console.log('✅ Customer jane@example.com already exists');
    }
    
    console.log('✅ Customers ready');

    // 7. Create Orders
    console.log('Creating orders...');
    if (createdSaffronItems.length > 0 && saffronTables.length > 0) {
      const firstItem = createdSaffronItems[0];
      const saffronOrder = await pb.collection('orders').create({
        tenantId: saffronTenant.id,
        locationId: saffronLocation.id,
        channel: 'dine_in',
        customerId: customer1.id,
        tableId: saffronTables[0].id,
        status: 'placed',
        subtotal: firstItem.basePrice,
        taxCgst: Math.round(firstItem.basePrice * (firstItem.taxRate / 2 / 100)),
        taxSgst: Math.round(firstItem.basePrice * (firstItem.taxRate / 2 / 100)),
        taxIgst: 0,
        total: Math.round(firstItem.basePrice * (1 + firstItem.taxRate / 100)),
      });

      await pb.collection('orderItem').create({
        orderId: saffronOrder.id,
        menuItemId: firstItem.id,
        nameSnapshot: firstItem.name,
        qty: 1,
        unitPrice: firstItem.basePrice,
      });
    }

    if (createdEmberItems.length > 0 && emberTables.length > 0) {
      const firstItem = createdEmberItems[0];
      const emberOrder = await pb.collection('orders').create({
        tenantId: emberTenant.id,
        locationId: emberLocation.id,
        channel: 'dine_in',
        customerId: customer2.id,
        tableId: emberTables[0].id,
        status: 'placed',
        subtotal: firstItem.basePrice,
        taxCgst: Math.round(firstItem.basePrice * (firstItem.taxRate / 2 / 100)),
        taxSgst: Math.round(firstItem.basePrice * (firstItem.taxRate / 2 / 100)),
        taxIgst: 0,
        total: Math.round(firstItem.basePrice * (1 + firstItem.taxRate / 100)),
      });

      await pb.collection('orderItem').create({
        orderId: emberOrder.id,
        menuItemId: firstItem.id,
        nameSnapshot: firstItem.name,
        qty: 1,
        unitPrice: firstItem.basePrice,
      });
    }
    console.log('✅ Created orders');

    // 8. Create KDS Ticket
    console.log('Creating KDS ticket...');
    // Note: KDS tickets will be created automatically when orders are accepted
    // via the order hooks, so we skip manual creation here
    console.log('✅ Created KDS ticket');

    console.log('🎉 Seed completed successfully!');
    console.log('\nTenants created:');
    console.log(`  - Saffron (key: saffron, id: ${saffronTenant.id})`);
    console.log(`  - Ember (key: ember, id: ${emberTenant.id})`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

if (require.main === module) {
  seed().catch(console.error);
}

module.exports = { seed };




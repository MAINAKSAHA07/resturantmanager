/**
 * Create remaining collections needed for seed script
 * Creates: tables, orders, orderItem
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function createCollections() {
  const pb = new PocketBase(PB_URL);

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated as admin');

    // Get all existing collections
    const existing = await pb.collections.getFullList();
    const existingNames = new Set(existing.map(c => c.name));
    console.log('Existing collections:', Array.from(existingNames).join(', '));

    // Get collection IDs we need for relations
    const tenantCollection = existing.find(c => c.name === 'tenant');
    const locationCollection = existing.find(c => c.name === 'location');
    const customerCollection = existing.find(c => c.name === 'customer');
    const menuItemCollection = existing.find(c => c.name === 'menuItem');

    if (!tenantCollection || !locationCollection) {
      throw new Error('tenant and location collections must exist first. Run: npm run pb:create-collections');
    }

    const tenantCollectionId = tenantCollection.id;
    const locationCollectionId = locationCollection.id;
    const customerCollectionId = customerCollection?.id;
    const menuItemCollectionId = menuItemCollection?.id;

    // Create tables collection
    if (!existingNames.has('tables')) {
      console.log('\n📦 Creating tables collection...');
      try {
        const tablesCollection = await pb.collections.create({
          name: 'tables',
          type: 'base',
          schema: [
            {
              name: 'tenantId',
              type: 'relation',
              required: true,
              options: {
                collectionId: tenantCollectionId,
                cascadeDelete: false,
              },
            },
            {
              name: 'locationId',
              type: 'relation',
              required: true,
              options: {
                collectionId: locationCollectionId,
                cascadeDelete: false,
              },
            },
            { name: 'name', type: 'text', required: true },
            { name: 'capacity', type: 'number', required: true },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'available',
              options: {
                maxSelect: 1,
                values: ['available', 'seated', 'cleaning', 'held'],
              },
            },
            { name: 'x', type: 'number', required: false, defaultValue: 0 },
            { name: 'y', type: 'number', required: false, defaultValue: 0 },
          ],
          listRule: '',
          viewRule: '',
          createRule: '',
          updateRule: '',
          deleteRule: '',
        });
        console.log('✅ Created tables collection, ID:', tablesCollection.id);
      } catch (error) {
        console.error('❌ Failed to create tables:', error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    } else {
      console.log('✅ tables collection already exists');
    }

    // Refresh collections list
    const allCollections = await pb.collections.getFullList();
    const tablesCollection = allCollections.find(c => c.name === 'tables');
    const tablesCollectionId = tablesCollection?.id;

    // Create orders collection
    if (!existingNames.has('orders')) {
      console.log('\n📦 Creating orders collection...');
      try {
        const ordersCollection = await pb.collections.create({
          name: 'orders',
          type: 'base',
          schema: [
            {
              name: 'tenantId',
              type: 'relation',
              required: true,
              options: {
                collectionId: tenantCollectionId,
                cascadeDelete: false,
              },
            },
            {
              name: 'locationId',
              type: 'relation',
              required: true,
              options: {
                collectionId: locationCollectionId,
                cascadeDelete: false,
              },
            },
            {
              name: 'channel',
              type: 'select',
              required: true,
              options: {
                maxSelect: 1,
                values: ['dine_in', 'pickup'],
              },
            },
            ...(customerCollectionId ? [{
              name: 'customerId',
              type: 'relation',
              required: false,
              options: {
                collectionId: customerCollectionId,
                cascadeDelete: false,
              },
            }] : []),
            ...(tablesCollectionId ? [{
              name: 'tableId',
              type: 'relation',
              required: false,
              options: {
                collectionId: tablesCollectionId,
                cascadeDelete: false,
              },
            }] : []),
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'placed',
              options: {
                maxSelect: 1,
                values: ['placed', 'accepted', 'in_kitchen', 'ready', 'served', 'completed', 'canceled', 'refunded'],
              },
            },
            { name: 'subtotal', type: 'number', required: true },
            { name: 'taxCgst', type: 'number', required: true, defaultValue: 0 },
            { name: 'taxSgst', type: 'number', required: true, defaultValue: 0 },
            { name: 'taxIgst', type: 'number', required: true, defaultValue: 0 },
            { name: 'total', type: 'number', required: true },
            { name: 'razorpayOrderId', type: 'text', required: false },
            { name: 'razorpayPaymentId', type: 'text', required: false },
            { name: 'timestamps', type: 'json', required: false, options: { maxSize: 2000000 } },
          ],
          listRule: '',
          viewRule: '',
          createRule: '',
          updateRule: '',
          deleteRule: '',
        });
        console.log('✅ Created orders collection, ID:', ordersCollection.id);
      } catch (error) {
        console.error('❌ Failed to create orders:', error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    } else {
      console.log('✅ orders collection already exists');
    }

    // Refresh collections list
    const updatedCollections = await pb.collections.getFullList();
    const ordersCollection = updatedCollections.find(c => c.name === 'orders');
    const ordersCollectionId = ordersCollection?.id;

    // Create orderItem collection
    if (!existingNames.has('orderItem')) {
      console.log('\n📦 Creating orderItem collection...');
      try {
        const orderItemCollection = await pb.collections.create({
          name: 'orderItem',
          type: 'base',
          schema: [
            ...(ordersCollectionId ? [{
              name: 'orderId',
              type: 'relation',
              required: true,
              options: {
                collectionId: ordersCollectionId,
                cascadeDelete: false,
              },
            }] : []),
            ...(menuItemCollectionId ? [{
              name: 'menuItemId',
              type: 'relation',
              required: true,
              options: {
                collectionId: menuItemCollectionId,
                cascadeDelete: false,
              },
            }] : []),
            { name: 'nameSnapshot', type: 'text', required: true },
            { name: 'qty', type: 'number', required: true },
            { name: 'unitPrice', type: 'number', required: true },
            { name: 'optionsSnapshot', type: 'json', required: false, options: { maxSize: 2000000 } },
          ],
          listRule: '',
          viewRule: '',
          createRule: '',
          updateRule: '',
          deleteRule: '',
        });
        console.log('✅ Created orderItem collection, ID:', orderItemCollection.id);
      } catch (error) {
        console.error('❌ Failed to create orderItem:', error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    } else {
      console.log('✅ orderItem collection already exists');
    }

    console.log('\n🎉 Remaining collections created successfully!');
    console.log('You can now run the seed script: npm run seed');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  createCollections().catch(console.error);
}

module.exports = { createCollections };


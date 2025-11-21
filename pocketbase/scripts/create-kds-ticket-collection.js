/**
 * Create kdsTicket collection
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function createKDSTicketCollection() {
  const pb = new PocketBase(PB_URL);

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated as admin');

    // Get all existing collections
    const existing = await pb.collections.getFullList();
    const existingNames = new Set(existing.map(c => c.name));

    // Get collection IDs we need for relations
    const tenantCollection = existing.find(c => c.name === 'tenant');
    const locationCollection = existing.find(c => c.name === 'location');
    const ordersCollection = existing.find(c => c.name === 'orders');

    if (!tenantCollection || !locationCollection || !ordersCollection) {
      throw new Error('tenant, location, and orders collections must exist first.');
    }

    if (existingNames.has('kdsTicket')) {
      console.log('✅ kdsTicket collection already exists');
      return;
    }

    console.log('\n📦 Creating kdsTicket collection...');
    const kdsTicketCollection = await pb.collections.create({
      name: 'kdsTicket',
      type: 'base',
      schema: [
        {
          name: 'tenantId',
          type: 'relation',
          required: true,
          options: {
            collectionId: tenantCollection.id,
            cascadeDelete: false,
          },
        },
        {
          name: 'locationId',
          type: 'relation',
          required: true,
          options: {
            collectionId: locationCollection.id,
            cascadeDelete: false,
          },
        },
        {
          name: 'orderId',
          type: 'relation',
          required: true,
          options: {
            collectionId: ordersCollection.id,
            cascadeDelete: false,
          },
        },
        {
          name: 'station',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['hot', 'cold', 'bar', 'default'],
          },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['queued', 'cooking', 'ready', 'bumped'],
          },
        },
        {
          name: 'ticketItems',
          type: 'json',
          required: true,
          options: {
            maxSize: 2000000,
          },
        },
        {
          name: 'priority',
          type: 'bool',
          required: true,
        },
      ],
      listRule: '@request.auth.tenantId = tenantId',
      viewRule: '@request.auth.tenantId = tenantId',
      createRule: '@request.auth.tenantId = tenantId',
      updateRule: '@request.auth.tenantId = tenantId',
      deleteRule: '@request.auth.tenantId = tenantId',
    });

    console.log('✅ Created kdsTicket collection, ID:', kdsTicketCollection.id);
    console.log('🎉 kdsTicket collection created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createKDSTicketCollection();


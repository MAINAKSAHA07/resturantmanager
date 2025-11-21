const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://localhost:8090');

async function createReservationCollection() {
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword('mainaksaha0807@gmail.com', '8104760831');

    // Check if collection already exists
    try {
      const existing = await pb.collections.getOne('reservation');
      console.log('✅ Reservation collection already exists');
      return;
    } catch (e) {
      // Collection doesn't exist, create it
    }

    // Get collection IDs
    const allCollections = await pb.collections.getFullList();
    const tenantCol = allCollections.find(c => c.name === 'tenant');
    const locationCol = allCollections.find(c => c.name === 'location');
    const customerCol = allCollections.find(c => c.name === 'customer');

    if (!tenantCol || !locationCol || !customerCol) {
      throw new Error('Required collections (tenant, location, customer) not found');
    }

    console.log('Found collections:', {
      tenant: tenantCol.id,
      location: locationCol.id,
      customer: customerCol.id,
    });

    // Create reservation collection
    const collection = await pb.collections.create({
      name: 'reservation',
      type: 'base',
      schema: [
        {
          name: 'tenantId',
          type: 'relation',
          required: true,
          options: {
            collectionId: tenantCol.id,
            cascadeDelete: false,
            maxSelect: 1,
            displayFields: ['name'],
          },
        },
        {
          name: 'locationId',
          type: 'relation',
          required: true,
          options: {
            collectionId: locationCol.id,
            cascadeDelete: false,
            maxSelect: 1,
            displayFields: ['name'],
          },
        },
        {
          name: 'customerId',
          type: 'relation',
          required: false,
          options: {
            collectionId: customerCol.id,
            cascadeDelete: false,
            maxSelect: 1,
            displayFields: ['name', 'email'],
          },
        },
        {
          name: 'partySize',
          type: 'number',
          required: true,
          options: {
            min: 1,
            max: 50,
          },
        },
        {
          name: 'startTime',
          type: 'date',
          required: true,
        },
        {
          name: 'endTime',
          type: 'date',
          required: false,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: {
            values: ['pending', 'confirmed', 'seated', 'completed', 'canceled', 'no_show'],
          },
        },
        {
          name: 'notes',
          type: 'text',
          required: false,
        },
      ],
    });

    console.log('✅ Created reservation collection:', collection.id);

    // Set collection rules
    await pb.collections.update('reservation', {
      options: {
        allowEmailAuth: false,
        allowOAuth2Auth: false,
        allowUsernameAuth: false,
        allowAnonymousAuth: false,
      },
    });

    // Set access rules (admin can do everything, customers can create)
    const rules = {
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    };

    await pb.collections.update('reservation', {
      options: {
        ...collection.options,
        ...rules,
      },
    });

    console.log('✅ Reservation collection setup complete');
  } catch (error) {
    console.error('❌ Error creating reservation collection:', error);
    throw error;
  }
}

createReservationCollection()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


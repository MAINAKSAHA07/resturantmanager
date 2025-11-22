const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function updateReservationCollection() {
  const pb = new PocketBase(PB_URL);
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated');

    // Get existing collection
    const collection = await pb.collections.getOne('reservation');
    console.log('Found reservation collection:', collection.id);
    console.log('Current fields:', collection.schema.map(f => f.name).join(', '));

    // Get collection IDs for relations
    const allCollections = await pb.collections.getFullList();
    const tenantCol = allCollections.find(c => c.name === 'tenant');
    const locationCol = allCollections.find(c => c.name === 'location');
    const customerCol = allCollections.find(c => c.name === 'customer');

    if (!tenantCol || !locationCol || !customerCol) {
      throw new Error('Required collections (tenant, location, customer) not found');
    }

    // Check which fields exist
    const existingFields = collection.schema.map(f => f.name);
    const requiredFields = {
      tenantId: {
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
      locationId: {
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
      customerId: {
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
      partySize: {
        name: 'partySize',
        type: 'number',
        required: true,
        options: {
          min: 1,
          max: 50,
        },
      },
      startTime: {
        name: 'startTime',
        type: 'date',
        required: true,
      },
      endTime: {
        name: 'endTime',
        type: 'date',
        required: false,
      },
      status: {
        name: 'status',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['pending', 'confirmed', 'seated', 'completed', 'canceled', 'no_show'],
        },
      },
      notes: {
        name: 'notes',
        type: 'text',
        required: false,
        options: {
          min: null,
          max: null,
          pattern: '',
        },
      },
    };

    // Update schema - add missing fields or update existing ones
    const updatedSchema = [...collection.schema];
    let updated = false;

    for (const [fieldName, fieldDef] of Object.entries(requiredFields)) {
      const existingField = updatedSchema.find(f => f.name === fieldName);
      
      if (!existingField) {
        console.log(`Adding missing field: ${fieldName}`);
        updatedSchema.push(fieldDef);
        updated = true;
      } else {
        // Check if status field needs maxSelect option
        if (fieldName === 'status' && !existingField.options?.maxSelect) {
          console.log(`Updating status field to add maxSelect`);
          existingField.options = { ...existingField.options, maxSelect: 1 };
          updated = true;
        }
        // Check if notes field needs options
        if (fieldName === 'notes' && !existingField.options) {
          console.log(`Updating notes field to add options`);
          existingField.options = {
            min: null,
            max: null,
            pattern: '',
          };
          updated = true;
        }
      }
    }

    if (updated) {
      await pb.collections.update('reservation', {
        schema: updatedSchema,
      });
      console.log('✅ Updated reservation collection schema');
    } else {
      console.log('✅ Reservation collection schema is up to date');
    }

    console.log('✅ Update complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

updateReservationCollection()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


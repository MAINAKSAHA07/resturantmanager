/**
 * Script to add availability field to menuItem collection schema
 * 
 * Note: PocketBase Admin API may not support schema modifications directly
 * This script will attempt to add the field, but you may need to add it manually
 * 
 * Run with: node pocketbase/scripts/add-availability-field-to-schema.js
 */

require('dotenv').config();
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function addAvailabilityField() {
  const pb = new PocketBase(PB_URL);

  try {
    console.log('🔌 Connecting to:', PB_URL);
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    console.log('📋 Getting menuItem collection...');
    const collection = await pb.collections.getOne('menuItem');

    // Check if field already exists
    console.log('Current schema fields:', collection.schema.map(f => f.name));
    const hasAvailability = collection.schema.some(field => field.name === 'availability');

    if (hasAvailability) {
      console.log('✅ availability field already exists in the schema!');
      return;
    }

    console.log('⚠️  availability field does not exist. Attempting to add...\n');

    // Try to update the collection schema
    // Note: This may not work with all PocketBase versions
    try {
      const updatedSchema = [
        ...collection.schema,
        {
          name: 'availability',
          type: 'text',
          required: true,
          options: {
            min: null,
            max: null,
            pattern: '',
          },
        }
      ];

      await pb.collections.update('menuItem', {
        schema: updatedSchema,
      });

      console.log('✅ Successfully added availability field to schema!');
      console.log('\n📝 Field details:');
      console.log('   - Name: availability');
      console.log('   - Type: Text');
      console.log('   - Required: Yes');

    } catch (error) {
      console.log('❌ Could not add field programmatically:', error.message);
      console.log('\n📝 Manual steps required:');
      console.log('   1. Open PocketBase Admin UI');
      console.log('   2. Go to: Collections → menuItem → Fields');
      console.log('   3. Click "Add new field"');
      console.log('   4. Configure:');
      console.log('      - Name: availability');
      console.log('      - Type: Text');
      console.log('      - Default value: available');
      console.log('      - Required: Yes');
      console.log('   5. Click "Save"');
      console.log('\n   Then run: npm run pb:migrate-availability');
      throw error;
    }

    // After adding the field, migrate existing data
    console.log('\n🔄 Migrating existing items...');
    const allItems = await pb.collection('menuItem').getFullList({
      batch: 500,
    });

    let updated = 0;
    for (const item of allItems) {
      try {
        if (!item.availability || (item.availability !== 'available' && item.availability !== 'not available')) {
          const availability = item.isActive !== false ? 'available' : 'not available';
          await pb.collection('menuItem').update(item.id, {
            availability: availability,
          });
          updated++;
        }
      } catch (error) {
        console.error(`   Error updating ${item.name}:`, error.message);
      }
    }

    console.log(`✅ Updated ${updated} items with availability field`);
    console.log('\n✅ Setup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please add the field manually in PocketBase Admin UI');
    process.exit(1);
  }
}

addAvailabilityField();



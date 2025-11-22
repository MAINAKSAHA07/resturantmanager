/**
 * Migration script to convert isActive boolean field to availability string field
 * 
 * This script:
 * 1. Adds a new 'availability' field to menuItem collection (if not exists)
 * 2. Converts existing isActive boolean values to availability strings
 * 3. Keeps isActive field for backward compatibility (can be removed later)
 * 
 * Run with: node pocketbase/scripts/migrate-availability-field.js
 */

require('dotenv').config();
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function migrateAvailabilityField() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    console.log('📋 Fetching all menu items...');
    const allItems = await pb.collection('menuItem').getFullList({
      batch: 500,
    });
    console.log(`✅ Found ${allItems.length} menu items\n`);

    if (allItems.length === 0) {
      console.log('ℹ️  No menu items to migrate');
      return;
    }

    console.log('🔄 Migrating isActive to availability...');
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of allItems) {
      try {
        // Check if item already has availability field set
        if (item.availability && (item.availability === 'available' || item.availability === 'not available')) {
          console.log(`⏭️  Skipping ${item.name} (already has availability: ${item.availability})`);
          skipped++;
          continue;
        }

        // Convert isActive boolean to availability string
        const availability = item.isActive !== false ? 'available' : 'not available';
        
        // Update the item
        await pb.collection('menuItem').update(item.id, {
          availability: availability,
        });

        console.log(`✅ Updated ${item.name}: isActive=${item.isActive} → availability=${availability}`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating ${item.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${allItems.length}`);
    
    console.log('\n✅ Migration completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. In PocketBase admin UI, update the menuItem collection schema:');
    console.log('      - Add "availability" field as Text type');
    console.log('      - Set default value to "available"');
    console.log('      - Make it required');
    console.log('      - Optionally remove "isActive" field after verifying everything works');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateAvailabilityField();



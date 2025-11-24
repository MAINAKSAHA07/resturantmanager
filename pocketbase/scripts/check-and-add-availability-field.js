/**
 * Script to check if availability field exists in menuItem collection
 * and add it if it doesn't exist
 * 
 * Run with: node pocketbase/scripts/check-and-add-availability-field.js
 */

require('dotenv').config();
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function checkAndAddAvailabilityField() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    console.log('📋 Checking menuItem collection schema...');
    
    // Get collection info
    const collection = await pb.collections.getOne('menuItem');
    
    console.log('📊 Current fields in menuItem collection:');
    collection.schema.forEach(field => {
      console.log(`   - ${field.name} (${field.type})`);
    });
    
    // Check if availability field exists
    const hasAvailability = collection.schema.some(field => field.name === 'availability');
    const hasIsActive = collection.schema.some(field => field.name === 'isActive');
    
    console.log(`\n🔍 Field check:`);
    console.log(`   - availability: ${hasAvailability ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   - isActive: ${hasIsActive ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (!hasAvailability) {
      console.log('\n⚠️  availability field does not exist in the collection!');
      console.log('\n📝 To add it manually:');
      console.log('   1. Go to PocketBase Admin UI');
      console.log('   2. Navigate to Collections → menuItem → Fields');
      console.log('   3. Click "Add new field"');
      console.log('   4. Set:');
      console.log('      - Name: availability');
      console.log('      - Type: Text');
      console.log('      - Default value: available');
      console.log('      - Required: Yes');
      console.log('   5. Save the field');
      console.log('\n   OR run the migration script: npm run pb:migrate-availability');
    } else {
      console.log('\n✅ availability field exists!');
      
      // Check if we need to update existing items
      console.log('\n🔄 Checking existing items...');
      const allItems = await pb.collection('menuItem').getFullList({
        batch: 500,
      });
      
      const itemsNeedingUpdate = allItems.filter(item => {
        return !item.availability || (item.availability !== 'available' && item.availability !== 'not available');
      });
      
      if (itemsNeedingUpdate.length > 0) {
        console.log(`\n⚠️  Found ${itemsNeedingUpdate.length} items that need availability field updated`);
        console.log('   Run: npm run pb:migrate-availability');
      } else {
        console.log(`\n✅ All ${allItems.length} items have valid availability values`);
      }
    }
    
    // Check a sample item to see current values
    if (collection.schema.length > 0) {
      console.log('\n📦 Sample item data:');
      try {
        const sampleItems = await pb.collection('menuItem').getList(1, 1);
        if (sampleItems.items.length > 0) {
          const sample = sampleItems.items[0];
          console.log(`   Item: ${sample.name}`);
          console.log(`   - availability: ${sample.availability || 'NOT SET'}`);
          console.log(`   - isActive: ${sample.isActive !== undefined ? sample.isActive : 'NOT SET'}`);
        }
      } catch (error) {
        console.log('   Could not fetch sample item');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status === 404) {
      console.error('   Collection "menuItem" not found. Make sure the collection exists.');
    }
    process.exit(1);
  }
}

checkAndAddAvailabilityField();



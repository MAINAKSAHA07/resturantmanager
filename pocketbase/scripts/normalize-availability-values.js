/**
 * Script to normalize all availability values to lowercase 'available' or 'not available'
 * 
 * This fixes inconsistencies like "Not Available" vs "not available"
 * 
 * Run with: node pocketbase/scripts/normalize-availability-values.js
 */

require('dotenv').config();
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function normalizeAvailability() {
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
      console.log('ℹ️  No menu items to normalize');
      return;
    }

    console.log('🔄 Normalizing availability values...');
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of allItems) {
      try {
        let normalizedAvailability;
        
        if (item.availability) {
          const normalized = String(item.availability).toLowerCase().trim();
          if (normalized === 'not available' || normalized === 'notavailable') {
            normalizedAvailability = 'not available';
          } else {
            normalizedAvailability = 'available';
          }
        } else if (item.isActive !== undefined) {
          // Fallback to isActive if availability is not set
          normalizedAvailability = item.isActive !== false ? 'available' : 'not available';
        } else {
          // Default to available
          normalizedAvailability = 'available';
        }
        
        // Only update if the value needs normalization
        const currentValue = String(item.availability || '').toLowerCase().trim();
        const needsUpdate = !item.availability || 
                           currentValue !== normalizedAvailability ||
                           currentValue === 'notavailable' ||
                           currentValue === 'not available' && item.availability !== 'not available';
        
        if (needsUpdate) {
          await pb.collection('menuItem').update(item.id, {
            availability: normalizedAvailability,
          });
          console.log(`✅ Updated ${item.name}: "${item.availability || 'undefined'}" → "${normalizedAvailability}"`);
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${item.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Normalization Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${allItems.length}`);
    
    console.log('\n✅ Normalization completed!');
    
  } catch (error) {
    console.error('❌ Normalization failed:', error);
    process.exit(1);
  }
}

normalizeAvailability();


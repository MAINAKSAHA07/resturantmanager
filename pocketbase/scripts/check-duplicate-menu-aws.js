/**
 * Check for duplicate menu items and categories in AWS PocketBase database
 * 
 * Usage:
 *   node pocketbase/scripts/check-duplicate-menu-aws.js
 */

require('dotenv').config();
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function checkDuplicateMenuAWS() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    console.log(`📍 Using PocketBase URL: ${PB_URL}`);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    // Check Menu Categories
    console.log('📦 Checking Menu Categories...');
    const allCategories = await pb.collection('menuCategory').getFullList({
      sort: 'created',
    });
    console.log(`Found ${allCategories.length} total menu categories\n`);

    // Group categories by tenant, location, and name
    const categoriesByKey = new Map();
    for (const category of allCategories) {
      const tenantId = Array.isArray(category.tenantId) ? category.tenantId[0] : category.tenantId;
      const locationId = Array.isArray(category.locationId) ? category.locationId[0] : category.locationId;
      const key = `${tenantId}|${locationId}|${category.name.toLowerCase().trim()}`;
      
      if (!categoriesByKey.has(key)) {
        categoriesByKey.set(key, []);
      }
      categoriesByKey.get(key).push(category);
    }

    // Find duplicate categories
    const duplicateCategories = [];
    for (const [key, categories] of categoriesByKey.entries()) {
      if (categories.length > 1) {
        const [tenantId, locationId, name] = key.split('|');
        duplicateCategories.push({ tenantId, locationId, name, categories });
      }
    }

    if (duplicateCategories.length > 0) {
      console.log(`🔍 Found ${duplicateCategories.length} duplicate category group(s):\n`);
      let totalDuplicateCategories = 0;
      for (const dup of duplicateCategories) {
        totalDuplicateCategories += dup.categories.length - 1; // -1 because we keep one
        console.log(`  "${dup.name}" (Tenant: ${dup.tenantId.slice(0, 8)}..., Location: ${dup.locationId.slice(0, 8)}...):`);
        dup.categories.forEach((cat, idx) => {
          const isOldest = idx === 0;
          console.log(`    ${isOldest ? '✅ KEEP' : '❌ DELETE'} - ID: ${cat.id}, Created: ${cat.created}, Sort: ${cat.sort || 'N/A'}`);
        });
        console.log('');
      }
      console.log(`📊 Total duplicate categories to remove: ${totalDuplicateCategories}\n`);
    } else {
      console.log('✅ No duplicate menu categories found!\n');
    }

    // Check Menu Items
    console.log('📦 Checking Menu Items...');
    const allMenuItems = await pb.collection('menuItem').getFullList({
      sort: 'created',
    });
    console.log(`Found ${allMenuItems.length} total menu items\n`);

    // Group menu items by tenant, location, category, and name
    const itemsByKey = new Map();
    for (const item of allMenuItems) {
      const tenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
      const locationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
      const categoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
      const key = `${tenantId}|${locationId}|${categoryId}|${item.name.toLowerCase().trim()}`;
      
      if (!itemsByKey.has(key)) {
        itemsByKey.set(key, []);
      }
      itemsByKey.get(key).push(item);
    }

    // Find duplicate menu items
    const duplicateItems = [];
    for (const [key, items] of itemsByKey.entries()) {
      if (items.length > 1) {
        const [tenantId, locationId, categoryId, name] = key.split('|');
        duplicateItems.push({ tenantId, locationId, categoryId, name, items });
      }
    }

    if (duplicateItems.length > 0) {
      console.log(`🔍 Found ${duplicateItems.length} duplicate menu item group(s):\n`);
      let totalDuplicateItems = 0;
      for (const dup of duplicateItems) {
        totalDuplicateItems += dup.items.length - 1; // -1 because we keep one
        console.log(`  "${dup.name}" (Tenant: ${dup.tenantId.slice(0, 8)}..., Location: ${dup.locationId.slice(0, 8)}..., Category: ${dup.categoryId.slice(0, 8)}...):`);
        dup.items.forEach((item, idx) => {
          const isOldest = idx === 0;
          const price = item.basePrice ? `₹${(item.basePrice / 100).toFixed(2)}` : 'N/A';
          const availability = item.availability || (item.isActive ? 'available' : 'not available');
          console.log(`    ${isOldest ? '✅ KEEP' : '❌ DELETE'} - ID: ${item.id}, Price: ${price}, Availability: ${availability}, Created: ${item.created}`);
        });
        console.log('');
      }
      console.log(`📊 Total duplicate menu items to remove: ${totalDuplicateItems}\n`);
    } else {
      console.log('✅ No duplicate menu items found!\n');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('📊 Summary:');
    console.log(`  Menu Categories: ${allCategories.length} total`);
    console.log(`    - Unique: ${allCategories.length - (duplicateCategories.reduce((sum, d) => sum + d.categories.length - 1, 0))}`);
    console.log(`    - Duplicate groups: ${duplicateCategories.length}`);
    console.log(`    - Duplicates to remove: ${duplicateCategories.reduce((sum, d) => sum + d.categories.length - 1, 0)}`);
    console.log(`  Menu Items: ${allMenuItems.length} total`);
    console.log(`    - Unique: ${allMenuItems.length - (duplicateItems.reduce((sum, d) => sum + d.items.length - 1, 0))}`);
    console.log(`    - Duplicate groups: ${duplicateItems.length}`);
    console.log(`    - Duplicates to remove: ${duplicateItems.reduce((sum, d) => sum + d.items.length - 1, 0)}`);
    console.log('='.repeat(60));

    if (duplicateCategories.length > 0 || duplicateItems.length > 0) {
      console.log('\n💡 To clean up duplicates, run:');
      console.log('   npm run pb:cleanup-duplicate-menu');
      console.log('   or');
      console.log('   node pocketbase/scripts/cleanup-duplicate-menu-items.js');
    }

    return {
      duplicateCategories,
      duplicateItems,
      totalCategories: allCategories.length,
      totalItems: allMenuItems.length,
    };

  } catch (error) {
    console.error('❌ Error during check:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.status) {
      console.error('Status:', error.status);
    }
    process.exit(1);
  }
}

// Run the check
checkDuplicateMenuAWS()
  .then((result) => {
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });


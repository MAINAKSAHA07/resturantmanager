/**
 * Check for duplicate menu items and categories with the same name for the same tenant
 */

const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function checkDuplicateMenuItems() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    // Check Menu Categories
    console.log('📦 Checking Menu Categories...');
    const allCategories = await pb.collection('menuCategory').getFullList({
      sort: 'created',
    });
    console.log(`Found ${allCategories.length} total menu categories\n`);

    // Group categories by tenant and name
    const categoriesByTenantAndName = new Map();
    for (const category of allCategories) {
      const tenantId = Array.isArray(category.tenantId) ? category.tenantId[0] : category.tenantId;
      const locationId = Array.isArray(category.locationId) ? category.locationId[0] : category.locationId;
      const key = `${tenantId}|${locationId}|${category.name.toLowerCase().trim()}`;
      
      if (!categoriesByTenantAndName.has(key)) {
        categoriesByTenantAndName.set(key, []);
      }
      categoriesByTenantAndName.get(key).push(category);
    }

    // Find duplicate categories
    const duplicateCategories = [];
    for (const [key, categories] of categoriesByTenantAndName.entries()) {
      if (categories.length > 1) {
        const [tenantId, locationId, name] = key.split('|');
        duplicateCategories.push({ tenantId, locationId, name, categories });
      }
    }

    if (duplicateCategories.length > 0) {
      console.log(`🔍 Found ${duplicateCategories.length} duplicate category name(s) within same tenant/location:\n`);
      for (const dup of duplicateCategories) {
        console.log(`  "${dup.name}" (Tenant: ${dup.tenantId}, Location: ${dup.locationId}):`);
        dup.categories.forEach(cat => {
          console.log(`    - ID: ${cat.id}, Created: ${cat.created}`);
        });
        console.log('');
      }
    } else {
      console.log('✅ No duplicate menu categories found!\n');
    }

    // Check Menu Items
    console.log('📦 Checking Menu Items...');
    const allMenuItems = await pb.collection('menuItem').getFullList({
      sort: 'created',
    });
    console.log(`Found ${allMenuItems.length} total menu items\n`);

    // Group menu items by tenant, location, and name
    const itemsByTenantLocationAndName = new Map();
    for (const item of allMenuItems) {
      const tenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
      const locationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
      const key = `${tenantId}|${locationId}|${item.name.toLowerCase().trim()}`;
      
      if (!itemsByTenantLocationAndName.has(key)) {
        itemsByTenantLocationAndName.set(key, []);
      }
      itemsByTenantLocationAndName.get(key).push(item);
    }

    // Find duplicate menu items
    const duplicateItems = [];
    for (const [key, items] of itemsByTenantLocationAndName.entries()) {
      if (items.length > 1) {
        const [tenantId, locationId, name] = key.split('|');
        duplicateItems.push({ tenantId, locationId, name, items });
      }
    }

    if (duplicateItems.length > 0) {
      console.log(`🔍 Found ${duplicateItems.length} duplicate menu item name(s) within same tenant/location:\n`);
      for (const dup of duplicateItems) {
        console.log(`  "${dup.name}" (Tenant: ${dup.tenantId}, Location: ${dup.locationId}):`);
        dup.items.forEach(item => {
          console.log(`    - ID: ${item.id}, Price: ₹${(item.basePrice || 0) / 100}, Created: ${item.created}`);
        });
        console.log('');
      }
    } else {
      console.log('✅ No duplicate menu items found!\n');
    }

    // Summary
    console.log('='.repeat(50));
    console.log('📊 Summary:');
    console.log(`  Menu Categories: ${allCategories.length} total, ${duplicateCategories.length} duplicate groups`);
    console.log(`  Menu Items: ${allMenuItems.length} total, ${duplicateItems.length} duplicate groups`);
    console.log('='.repeat(50));

    // Return data for potential cleanup
    return {
      duplicateCategories,
      duplicateItems,
      totalCategories: allCategories.length,
      totalItems: allMenuItems.length,
    };

  } catch (error) {
    console.error('❌ Error during check:', error);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the check
checkDuplicateMenuItems()
  .then((result) => {
    console.log('\n✅ Check completed!');
    if (result.duplicateCategories.length > 0 || result.duplicateItems.length > 0) {
      console.log('\n💡 Tip: Run cleanup script to remove duplicates');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });


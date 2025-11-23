/**
 * Cleanup script to remove duplicate menu items and categories with the same name
 * for the same tenant/location. Keeps the oldest one and migrates references.
 * 
 * Usage:
 *   node pocketbase/scripts/cleanup-duplicate-menu-items.js
 */

require('dotenv').config();
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function cleanupDuplicateMenuItems() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    console.log(`📍 Using PocketBase URL: ${PB_URL}`);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    // Cleanup Menu Categories
    console.log('📦 Cleaning up Menu Categories...');
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

    // Find and process duplicate categories
    const duplicateCategories = [];
    for (const [key, categories] of categoriesByKey.entries()) {
      if (categories.length > 1) {
        duplicateCategories.push({ key, categories });
      }
    }

    let keptCategories = 0;
    let deletedCategories = 0;
    let migratedCategoryItems = 0;

    for (const { key, categories } of duplicateCategories) {
      const [tenantId, locationId, name] = key.split('|');
      console.log(`\n📋 Processing duplicate category "${name}" (Tenant: ${tenantId}, Location: ${locationId}):`);
      
      // Sort by created date (oldest first)
      categories.sort((a, b) => new Date(a.created) - new Date(b.created));
      
      // Keep the first one (oldest)
      const keepCategory = categories[0];
      console.log(`  ✅ Keeping: ${keepCategory.id} (created: ${keepCategory.created})`);
      keptCategories++;

      // Migrate menu items and delete duplicates
      for (let i = 1; i < categories.length; i++) {
        const duplicateCategory = categories[i];
        console.log(`  🔄 Processing duplicate: ${duplicateCategory.id} (created: ${duplicateCategory.created})`);
        
        // Find all menu items in this duplicate category
        try {
          const itemsInDuplicate = await pb.collection('menuItem').getFullList({
            filter: `categoryId = "${duplicateCategory.id}" || categoryId ~ "${duplicateCategory.id}"`,
          });
          
          // Migrate items to the kept category
          for (const item of itemsInDuplicate) {
            await pb.collection('menuItem').update(item.id, { categoryId: keepCategory.id });
            migratedCategoryItems++;
          }
          
          if (itemsInDuplicate.length > 0) {
            console.log(`     ✅ Migrated ${itemsInDuplicate.length} menu item(s) to category ${keepCategory.id}`);
          }
        } catch (error) {
          console.error(`     ⚠️  Error migrating items:`, error.message);
        }

        // Delete the duplicate category
        try {
          await pb.collection('menuCategory').delete(duplicateCategory.id);
          console.log(`     🗑️  Deleted: ${duplicateCategory.id}`);
          deletedCategories++;
        } catch (error) {
          console.error(`     ❌ Failed to delete ${duplicateCategory.id}:`, error.message);
        }
      }
    }

    // Cleanup Menu Items
    console.log('\n\n📦 Cleaning up Menu Items...');
    const allMenuItems = await pb.collection('menuItem').getFullList({
      sort: 'created',
    });
    console.log(`Found ${allMenuItems.length} total menu items\n`);

    // Group menu items by tenant, location, and name
    const itemsByKey = new Map();
    for (const item of allMenuItems) {
      const tenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
      const locationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
      const key = `${tenantId}|${locationId}|${item.name.toLowerCase().trim()}`;
      
      if (!itemsByKey.has(key)) {
        itemsByKey.set(key, []);
      }
      itemsByKey.get(key).push(item);
    }

    // Find and process duplicate items
    const duplicateItems = [];
    for (const [key, items] of itemsByKey.entries()) {
      if (items.length > 1) {
        duplicateItems.push({ key, items });
      }
    }

    let keptItems = 0;
    let deletedItems = 0;
    let migratedOrderItems = 0;

    for (const { key, items } of duplicateItems) {
      const [tenantId, locationId, name] = key.split('|');
      console.log(`\n📋 Processing duplicate item "${name}" (Tenant: ${tenantId}, Location: ${locationId}):`);
      
      // Sort by created date (oldest first)
      items.sort((a, b) => new Date(a.created) - new Date(b.created));
      
      // Keep the first one (oldest)
      const keepItem = items[0];
      console.log(`  ✅ Keeping: ${keepItem.id} (created: ${keepItem.created}, price: ₹${(keepItem.basePrice || 0) / 100})`);
      keptItems++;

      // Migrate order items and delete duplicates
      for (let i = 1; i < items.length; i++) {
        const duplicateItem = items[i];
        console.log(`  🔄 Processing duplicate: ${duplicateItem.id} (created: ${duplicateItem.created}, price: ₹${(duplicateItem.basePrice || 0) / 100})`);
        
        // Find all order items referencing this duplicate menu item
        try {
          const orderItems = await pb.collection('orderItem').getFullList({
            filter: `menuItemId = "${duplicateItem.id}" || menuItemId ~ "${duplicateItem.id}"`,
          });
          
          // Migrate order items to the kept menu item
          for (const orderItem of orderItems) {
            await pb.collection('orderItem').update(orderItem.id, { menuItemId: keepItem.id });
            migratedOrderItems++;
          }
          
          if (orderItems.length > 0) {
            console.log(`     ✅ Migrated ${orderItems.length} order item(s) to menu item ${keepItem.id}`);
          }
        } catch (error) {
          console.error(`     ⚠️  Error migrating order items:`, error.message);
        }

        // Check for option groups (they cascade delete, but let's be safe)
        try {
          const optionGroups = await pb.collection('optionGroup').getFullList({
            filter: `menuItemId = "${duplicateItem.id}" || menuItemId ~ "${duplicateItem.id}"`,
          });
          
          // Migrate option groups to the kept menu item
          for (const group of optionGroups) {
            await pb.collection('optionGroup').update(group.id, { menuItemId: keepItem.id });
          }
          
          if (optionGroups.length > 0) {
            console.log(`     ✅ Migrated ${optionGroups.length} option group(s) to menu item ${keepItem.id}`);
          }
        } catch (error) {
          // Collection might not exist or error
          console.log(`     ℹ️  Option groups check skipped:`, error.message);
        }

        // Delete the duplicate menu item
        try {
          await pb.collection('menuItem').delete(duplicateItem.id);
          console.log(`     🗑️  Deleted: ${duplicateItem.id}`);
          deletedItems++;
        } catch (error) {
          console.error(`     ❌ Failed to delete ${duplicateItem.id}:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Cleanup Summary:');
    console.log(`  Menu Categories:`);
    console.log(`    ✅ Kept: ${keptCategories}`);
    console.log(`    🗑️  Deleted: ${deletedCategories}`);
    console.log(`    🔄 Migrated items: ${migratedCategoryItems}`);
    console.log(`  Menu Items:`);
    console.log(`    ✅ Kept: ${keptItems}`);
    console.log(`    🗑️  Deleted: ${deletedItems}`);
    console.log(`    🔄 Migrated order items: ${migratedOrderItems}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the cleanup
cleanupDuplicateMenuItems()
  .then(() => {
    console.log('\n✅ Cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });


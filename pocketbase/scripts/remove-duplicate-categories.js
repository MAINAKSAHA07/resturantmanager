/**
 * Script to remove duplicate categories from the database
 * Keeps the category with the lowest sort order (or earliest ID if sort is same)
 * and updates all menu items to use the kept category
 */

require('dotenv').config();
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function removeDuplicateCategories() {
  const pb = new PocketBase(PB_URL);

  try {
    console.log('Authenticating...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Authenticated');

    // Get all categories
    console.log('Fetching all categories...');
    const allCategories = await pb.collection('menuCategory').getList(1, 1000, {
      sort: 'sort,created',
    });
    console.log(`Found ${allCategories.items.length} categories`);

    // Group by tenant, location, and name
    const categoryGroups = new Map();

    allCategories.items.forEach(cat => {
      const tenantId = Array.isArray(cat.tenantId) ? cat.tenantId[0] : cat.tenantId;
      const locationId = Array.isArray(cat.locationId) ? cat.locationId[0] : cat.locationId;
      const nameKey = `${tenantId}_${locationId}_${cat.name.toLowerCase().trim()}`;

      if (!categoryGroups.has(nameKey)) {
        categoryGroups.set(nameKey, []);
      }
      categoryGroups.get(nameKey).push(cat);
    });

    // Find duplicates and determine which to keep
    const duplicatesToRemove = [];
    const categoryMapping = new Map(); // Maps duplicate IDs to the ID to keep

    categoryGroups.forEach((categories, key) => {
      if (categories.length > 1) {
        // Sort by sort order, then by ID (earlier = better)
        categories.sort((a, b) => {
          if (a.sort !== b.sort) {
            return a.sort - b.sort;
          }
          return a.id.localeCompare(b.id);
        });

        const keepCategory = categories[0];
        const duplicates = categories.slice(1);

        console.log(`\nFound ${categories.length} duplicates for "${keepCategory.name}":`);
        console.log(`  Keeping: ${keepCategory.id} (sort: ${keepCategory.sort})`);

        duplicates.forEach(dup => {
          console.log(`  Removing: ${dup.id} (sort: ${dup.sort})`);
          duplicatesToRemove.push(dup.id);
          categoryMapping.set(dup.id, keepCategory.id);
        });
      }
    });

    if (duplicatesToRemove.length === 0) {
      console.log('\n✓ No duplicate categories found!');
      return;
    }

    // Update menu items to use the kept category
    console.log('\nUpdating menu items...');
    const allItems = await pb.collection('menuItem').getList(1, 1000);

    let updatedItems = 0;
    for (const item of allItems.items) {
      const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
      
      if (categoryMapping.has(itemCategoryId)) {
        const newCategoryId = categoryMapping.get(itemCategoryId);
        await pb.collection('menuItem').update(item.id, {
          categoryId: newCategoryId,
        });
        updatedItems++;
        console.log(`  Updated item "${item.name}" (${item.id}) to use category ${newCategoryId}`);
      }
    }

    console.log(`\n✓ Updated ${updatedItems} menu items`);

    // Delete duplicate categories
    console.log('\nDeleting duplicate categories...');
    let deletedCount = 0;
    for (const categoryId of duplicatesToRemove) {
      try {
        await pb.collection('menuCategory').delete(categoryId);
        deletedCount++;
        console.log(`  Deleted category ${categoryId}`);
      } catch (error) {
        console.error(`  Error deleting category ${categoryId}:`, error.message);
      }
    }

    console.log(`\n✓ Deleted ${deletedCount} duplicate categories`);
    console.log('\n✓ Cleanup complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeDuplicateCategories();


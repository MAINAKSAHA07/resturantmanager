/**
 * Script to check for duplicate menu items in the database
 * Reports duplicates by ID, name+category, and name+category+location
 */

require('dotenv').config();
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function checkDuplicateItems() {
  const pb = new PocketBase(PB_URL);

  try {
    console.log('Authenticating...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Authenticated\n');

    // Get all menu items
    console.log('Fetching all menu items...');
    const allItems = await pb.collection('menuItem').getList(1, 1000, {
      expand: 'categoryId,tenantId,locationId',
    });
    console.log(`Found ${allItems.items.length} total items\n`);

    // Check for duplicate IDs (shouldn't happen, but check anyway)
    const idMap = new Map();
    const duplicateIds = [];
    allItems.items.forEach(item => {
      if (idMap.has(item.id)) {
        duplicateIds.push(item.id);
      } else {
        idMap.set(item.id, item);
      }
    });

    if (duplicateIds.length > 0) {
      console.log(`⚠️  Found ${duplicateIds.length} duplicate IDs (this shouldn't happen!):`);
      duplicateIds.forEach(id => console.log(`  - ${id}`));
      console.log('');
    } else {
      console.log('✓ No duplicate IDs found\n');
    }

    // Check for duplicates by name + category
    console.log('Checking for duplicates by name + category...');
    const nameCategoryMap = new Map();
    const duplicatesByNameCategory = [];

    allItems.items.forEach(item => {
      const categoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
      const key = `${item.name.toLowerCase().trim()}_${categoryId || 'nocategory'}`;
      
      if (!nameCategoryMap.has(key)) {
        nameCategoryMap.set(key, []);
      }
      nameCategoryMap.get(key).push(item);
    });

    nameCategoryMap.forEach((items, key) => {
      if (items.length > 1) {
        duplicatesByNameCategory.push({ key, items });
      }
    });

    if (duplicatesByNameCategory.length > 0) {
      console.log(`⚠️  Found ${duplicatesByNameCategory.length} groups of duplicate items by name+category:\n`);
      duplicatesByNameCategory.forEach(({ key, items }) => {
        const [name, categoryId] = key.split('_');
        console.log(`  "${name}" in category ${categoryId}:`);
        items.forEach(item => {
          const tenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
          const locationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
          console.log(`    - ID: ${item.id}`);
          console.log(`      Tenant: ${tenantId}`);
          console.log(`      Location: ${locationId}`);
          console.log(`      Created: ${item.created}`);
          console.log(`      Updated: ${item.updated || 'N/A'}`);
        });
        console.log('');
      });
    } else {
      console.log('✓ No duplicates by name+category found\n');
    }

    // Check for duplicates by name + category + location
    console.log('Checking for duplicates by name + category + location...');
    const nameCategoryLocationMap = new Map();
    const duplicatesByNameCategoryLocation = [];

    allItems.items.forEach(item => {
      const categoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
      const locationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
      const key = `${item.name.toLowerCase().trim()}_${categoryId || 'nocategory'}_${locationId || 'nolocation'}`;
      
      if (!nameCategoryLocationMap.has(key)) {
        nameCategoryLocationMap.set(key, []);
      }
      nameCategoryLocationMap.get(key).push(item);
    });

    nameCategoryLocationMap.forEach((items, key) => {
      if (items.length > 1) {
        duplicatesByNameCategoryLocation.push({ key, items });
      }
    });

    if (duplicatesByNameCategoryLocation.length > 0) {
      console.log(`⚠️  Found ${duplicatesByNameCategoryLocation.length} groups of duplicate items by name+category+location:\n`);
      duplicatesByNameCategoryLocation.forEach(({ key, items }) => {
        const [name, categoryId, locationId] = key.split('_');
        console.log(`  "${name}" in category ${categoryId}, location ${locationId}:`);
        items.forEach(item => {
          console.log(`    - ID: ${item.id}`);
          console.log(`      Created: ${item.created}`);
          console.log(`      Updated: ${item.updated || 'N/A'}`);
        });
        console.log('');
      });
    } else {
      console.log('✓ No duplicates by name+category+location found\n');
    }

    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Total items: ${allItems.items.length}`);
    console.log(`Unique IDs: ${idMap.size}`);
    console.log(`Unique by name+category: ${nameCategoryMap.size}`);
    console.log(`Unique by name+category+location: ${nameCategoryLocationMap.size}`);
    console.log(`\nDuplicate groups by name+category: ${duplicatesByNameCategory.length}`);
    console.log(`Duplicate groups by name+category+location: ${duplicatesByNameCategoryLocation.length}`);

    if (duplicatesByNameCategory.length > 0 || duplicatesByNameCategoryLocation.length > 0) {
      console.log('\n⚠️  Duplicates found in database!');
      console.log('Consider running a cleanup script to remove duplicates.');
    } else {
      console.log('\n✓ No duplicates found in database!');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDuplicateItems();


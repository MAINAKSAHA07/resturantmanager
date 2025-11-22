/**
 * Cleanup script to remove duplicate tables with the same name
 * for the same tenant/location. Keeps the oldest one and migrates references.
 */

const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function cleanupDuplicateTables() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    console.log('📦 Cleaning up Tables...');
    const allTables = await pb.collection('tables').getFullList({
      sort: 'created',
    });
    console.log(`Found ${allTables.length} total tables\n`);

    // Group tables by tenant, location, and name
    const tablesByKey = new Map();
    for (const table of allTables) {
      const tenantId = Array.isArray(table.tenantId) ? table.tenantId[0] : table.tenantId;
      const locationId = Array.isArray(table.locationId) ? table.locationId[0] : table.locationId;
      const key = `${tenantId}|${locationId}|${table.name.toLowerCase().trim()}`;
      
      if (!tablesByKey.has(key)) {
        tablesByKey.set(key, []);
      }
      tablesByKey.get(key).push(table);
    }

    // Find and process duplicate tables
    const duplicateTables = [];
    for (const [key, tables] of tablesByKey.entries()) {
      if (tables.length > 1) {
        duplicateTables.push({ key, tables });
      }
    }

    let keptTables = 0;
    let deletedTables = 0;
    let migratedOrders = 0;

    for (const { key, tables } of duplicateTables) {
      const [tenantId, locationId, name] = key.split('|');
      console.log(`\n📋 Processing duplicate table "${name}" (Tenant: ${tenantId}, Location: ${locationId}):`);
      
      // Sort by created date (oldest first)
      tables.sort((a, b) => new Date(a.created) - new Date(b.created));
      
      // Keep the first one (oldest)
      const keepTable = tables[0];
      console.log(`  ✅ Keeping: ${keepTable.id} (created: ${keepTable.created}, status: ${keepTable.status})`);
      keptTables++;

      // Migrate orders and delete duplicates
      for (let i = 1; i < tables.length; i++) {
        const duplicateTable = tables[i];
        console.log(`  🔄 Processing duplicate: ${duplicateTable.id} (created: ${duplicateTable.created}, status: ${duplicateTable.status})`);
        
        // Find all orders for this duplicate table
        try {
          const orders = await pb.collection('orders').getFullList({
            filter: `tableId = "${duplicateTable.id}" || tableId ~ "${duplicateTable.id}"`,
          });
          
          // Migrate orders to the kept table
          for (const order of orders) {
            await pb.collection('orders').update(order.id, { tableId: keepTable.id });
            migratedOrders++;
          }
          
          if (orders.length > 0) {
            console.log(`     ✅ Migrated ${orders.length} order(s) to table ${keepTable.id}`);
          }
        } catch (error) {
          console.error(`     ⚠️  Error migrating orders:`, error.message);
        }

        // Delete the duplicate table
        try {
          await pb.collection('tables').delete(duplicateTable.id);
          console.log(`     🗑️  Deleted: ${duplicateTable.id}`);
          deletedTables++;
        } catch (error) {
          console.error(`     ❌ Failed to delete ${duplicateTable.id}:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Cleanup Summary:');
    console.log(`  ✅ Kept: ${keptTables} table(s)`);
    console.log(`  🗑️  Deleted: ${deletedTables} duplicate table(s)`);
    console.log(`  🔄 Migrated orders: ${migratedOrders}`);
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
cleanupDuplicateTables()
  .then(() => {
    console.log('\n✅ Cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });


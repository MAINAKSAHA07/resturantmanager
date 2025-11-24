/**
 * Check for duplicate tables with the same name for the same tenant/location
 */

const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function checkDuplicateTables() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    console.log('📦 Checking Tables...');
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

    // Find duplicate tables
    const duplicateTables = [];
    for (const [key, tables] of tablesByKey.entries()) {
      if (tables.length > 1) {
        duplicateTables.push({ key, tables });
      }
    }

    if (duplicateTables.length > 0) {
      console.log(`🔍 Found ${duplicateTables.length} duplicate table name(s) within same tenant/location:\n`);
      for (const dup of duplicateTables) {
        const [tenantId, locationId, name] = dup.key.split('|');
        console.log(`  "${name}" (Tenant: ${tenantId}, Location: ${locationId}):`);
        dup.tables.forEach(table => {
          console.log(`    - ID: ${table.id}, Status: ${table.status}, Created: ${table.created}`);
        });
        console.log('');
      }
    } else {
      console.log('✅ No duplicate tables found!\n');
    }

    // Summary
    console.log('='.repeat(50));
    console.log('📊 Summary:');
    console.log(`  Tables: ${allTables.length} total, ${duplicateTables.length} duplicate groups`);
    console.log('='.repeat(50));

    return {
      duplicateTables,
      totalTables: allTables.length,
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
checkDuplicateTables()
  .then((result) => {
    console.log('\n✅ Check completed!');
    if (result.duplicateTables.length > 0) {
      console.log('\n💡 Tip: Run cleanup script to remove duplicates');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });


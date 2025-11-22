/**
 * Aggressive cleanup script to remove duplicate locations with the same name
 * Migrates all references from duplicates to the kept location, then deletes duplicates
 * USE WITH CAUTION - This will migrate data between locations
 */

const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function cleanupDuplicateLocationsWithMigration() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    // Fetch all locations
    console.log('📦 Fetching all locations...');
    const allLocations = await pb.collection('location').getFullList({
      sort: 'created', // Keep the oldest one (first created)
    });
    console.log(`Found ${allLocations.length} total locations\n`);

    // Group locations by name (case-insensitive)
    const locationsByName = new Map();
    for (const location of allLocations) {
      const nameKey = location.name.toLowerCase().trim();
      if (!locationsByName.has(nameKey)) {
        locationsByName.set(nameKey, []);
      }
      locationsByName.get(nameKey).push(location);
    }

    // Find duplicates
    const duplicates = [];
    for (const [name, locations] of locationsByName.entries()) {
      if (locations.length > 1) {
        duplicates.push({ name, locations });
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ No duplicate locations found. Database is clean!');
      return;
    }

    console.log(`🔍 Found ${duplicates.length} duplicate location name(s):\n`);
    duplicates.forEach(({ name, locations }) => {
      console.log(`  "${name}": ${locations.length} locations`);
    });
    console.log('');

    // Function to migrate references from duplicate to kept location
    async function migrateReferences(fromLocationId, toLocationId) {
      const migrated = {
        tables: 0,
        orders: 0,
        menuCategories: 0,
        menuItems: 0,
        reservations: 0,
        kdsTickets: 0,
      };

      try {
        // Migrate tables
        const tables = await pb.collection('tables').getFullList({
          filter: `locationId = "${fromLocationId}" || locationId ~ "${fromLocationId}"`,
        });
        for (const table of tables) {
          await pb.collection('tables').update(table.id, { locationId: toLocationId });
          migrated.tables++;
        }

        // Migrate orders
        const orders = await pb.collection('orders').getFullList({
          filter: `locationId = "${fromLocationId}" || locationId ~ "${fromLocationId}"`,
        });
        for (const order of orders) {
          await pb.collection('orders').update(order.id, { locationId: toLocationId });
          migrated.orders++;
        }

        // Migrate menu categories
        const menuCategories = await pb.collection('menuCategory').getFullList({
          filter: `locationId = "${fromLocationId}" || locationId ~ "${fromLocationId}"`,
        });
        for (const category of menuCategories) {
          await pb.collection('menuCategory').update(category.id, { locationId: toLocationId });
          migrated.menuCategories++;
        }

        // Migrate menu items
        const menuItems = await pb.collection('menuItem').getFullList({
          filter: `locationId = "${fromLocationId}" || locationId ~ "${fromLocationId}"`,
        });
        for (const item of menuItems) {
          await pb.collection('menuItem').update(item.id, { locationId: toLocationId });
          migrated.menuItems++;
        }

        // Migrate reservations
        try {
          const reservations = await pb.collection('reservation').getFullList({
            filter: `locationId = "${fromLocationId}" || locationId ~ "${fromLocationId}"`,
          });
          for (const reservation of reservations) {
            await pb.collection('reservation').update(reservation.id, { locationId: toLocationId });
            migrated.reservations++;
          }
        } catch (e) {
          // Collection might not exist
        }

        // Migrate KDS tickets
        try {
          const kdsTickets = await pb.collection('kdsTicket').getFullList({
            filter: `locationId = "${fromLocationId}" || locationId ~ "${fromLocationId}"`,
          });
          for (const ticket of kdsTickets) {
            await pb.collection('kdsTicket').update(ticket.id, { locationId: toLocationId });
            migrated.kdsTickets++;
          }
        } catch (e) {
          // Collection might not exist
        }
      } catch (error) {
        console.error(`Error migrating references from ${fromLocationId}:`, error.message);
      }

      return migrated;
    }

    // Process duplicates
    let kept = 0;
    let deleted = 0;
    let migrated = 0;
    const totalMigrated = {
      tables: 0,
      orders: 0,
      menuCategories: 0,
      menuItems: 0,
      reservations: 0,
      kdsTickets: 0,
    };

    for (const { name, locations } of duplicates) {
      console.log(`\n📋 Processing duplicates for "${name}":`);
      
      // Sort by created date (oldest first) to keep the first one
      locations.sort((a, b) => new Date(a.created) - new Date(b.created));
      
      // Keep the first one (oldest)
      const keepLocation = locations[0];
      console.log(`  ✅ Keeping: ${keepLocation.id} (created: ${keepLocation.created})`);
      kept++;

      // Migrate references and delete duplicates
      for (let i = 1; i < locations.length; i++) {
        const duplicateLocation = locations[i];
        console.log(`  🔄 Processing duplicate: ${duplicateLocation.id} (created: ${duplicateLocation.created})`);
        
        // Migrate all references to the kept location
        console.log(`     Migrating references to ${keepLocation.id}...`);
        const migratedData = await migrateReferences(duplicateLocation.id, keepLocation.id);
        
        // Sum up migrated items
        Object.keys(migratedData).forEach(key => {
          totalMigrated[key] += migratedData[key];
        });

        const totalMigratedForThis = Object.values(migratedData).reduce((sum, val) => sum + val, 0);
        if (totalMigratedForThis > 0) {
          console.log(`     ✅ Migrated:`, migratedData);
          migrated++;
        }

        // Now delete the duplicate
        try {
          await pb.collection('location').delete(duplicateLocation.id);
          console.log(`     🗑️  Deleted: ${duplicateLocation.id}`);
          deleted++;
        } catch (error) {
          console.error(`     ❌ Failed to delete ${duplicateLocation.id}:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Cleanup Summary:');
    console.log(`  ✅ Kept: ${kept} location(s)`);
    console.log(`  🗑️  Deleted: ${deleted} duplicate location(s)`);
    console.log(`  🔄 Migrated references from: ${migrated} location(s)`);
    console.log(`  📦 Total items migrated:`);
    console.log(`     - Tables: ${totalMigrated.tables}`);
    console.log(`     - Orders: ${totalMigrated.orders}`);
    console.log(`     - Menu Categories: ${totalMigrated.menuCategories}`);
    console.log(`     - Menu Items: ${totalMigrated.menuItems}`);
    console.log(`     - Reservations: ${totalMigrated.reservations}`);
    console.log(`     - KDS Tickets: ${totalMigrated.kdsTickets}`);
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
cleanupDuplicateLocationsWithMigration()
  .then(() => {
    console.log('\n✅ Cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });


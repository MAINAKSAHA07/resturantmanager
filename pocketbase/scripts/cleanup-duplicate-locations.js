/**
 * Cleanup script to remove duplicate locations with the same name
 * Keeps the first location for each unique name and deletes duplicates
 * Only deletes locations that have no references (orders, menu items, tables, etc.)
 */

const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function cleanupDuplicateLocations() {
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

    // Function to check if location has any references
    async function hasReferences(locationId) {
      const checks = {
        tables: 0,
        orders: 0,
        menuCategories: 0,
        menuItems: 0,
        reservations: 0,
        kdsTickets: 0,
      };

      try {
        // Check tables
        const tables = await pb.collection('tables').getList(1, 1, {
          filter: `locationId = "${locationId}" || locationId ~ "${locationId}"`,
        });
        checks.tables = tables.totalItems;

        // Check orders
        const orders = await pb.collection('orders').getList(1, 1, {
          filter: `locationId = "${locationId}" || locationId ~ "${locationId}"`,
        });
        checks.orders = orders.totalItems;

        // Check menu categories
        const menuCategories = await pb.collection('menuCategory').getList(1, 1, {
          filter: `locationId = "${locationId}" || locationId ~ "${locationId}"`,
        });
        checks.menuCategories = menuCategories.totalItems;

        // Check menu items
        const menuItems = await pb.collection('menuItem').getList(1, 1, {
          filter: `locationId = "${locationId}" || locationId ~ "${locationId}"`,
        });
        checks.menuItems = menuItems.totalItems;

        // Check reservations
        try {
          const reservations = await pb.collection('reservation').getList(1, 1, {
            filter: `locationId = "${locationId}" || locationId ~ "${locationId}"`,
          });
          checks.reservations = reservations.totalItems;
        } catch (e) {
          // Collection might not exist
        }

        // Check KDS tickets
        try {
          const kdsTickets = await pb.collection('kdsTicket').getList(1, 1, {
            filter: `locationId = "${locationId}" || locationId ~ "${locationId}"`,
          });
          checks.kdsTickets = kdsTickets.totalItems;
        } catch (e) {
          // Collection might not exist
        }
      } catch (error) {
        console.error(`Error checking references for ${locationId}:`, error.message);
      }

      const total = Object.values(checks).reduce((sum, val) => sum + val, 0);
      return { hasReferences: total > 0, checks, total };
    }

    // Process duplicates
    let kept = 0;
    let deleted = 0;
    let skipped = 0;

    for (const { name, locations } of duplicates) {
      console.log(`\n📋 Processing duplicates for "${name}":`);
      
      // Sort by created date (oldest first) to keep the first one
      locations.sort((a, b) => new Date(a.created) - new Date(b.created));
      
      // Keep the first one (oldest)
      const keepLocation = locations[0];
      console.log(`  ✅ Keeping: ${keepLocation.id} (created: ${keepLocation.created})`);
      kept++;

      // Check and delete duplicates
      for (let i = 1; i < locations.length; i++) {
        const duplicateLocation = locations[i];
        console.log(`  🔍 Checking duplicate: ${duplicateLocation.id} (created: ${duplicateLocation.created})`);
        
        const refCheck = await hasReferences(duplicateLocation.id);
        
        if (refCheck.hasReferences) {
          console.log(`  ⚠️  Skipping ${duplicateLocation.id} - has references:`, refCheck.checks);
          skipped++;
        } else {
          try {
            await pb.collection('location').delete(duplicateLocation.id);
            console.log(`  🗑️  Deleted: ${duplicateLocation.id}`);
            deleted++;
          } catch (error) {
            console.error(`  ❌ Failed to delete ${duplicateLocation.id}:`, error.message);
            skipped++;
          }
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Cleanup Summary:');
    console.log(`  ✅ Kept: ${kept} location(s)`);
    console.log(`  🗑️  Deleted: ${deleted} duplicate location(s)`);
    console.log(`  ⚠️  Skipped: ${skipped} location(s) (have references)`);
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
cleanupDuplicateLocations()
  .then(() => {
    console.log('\n✅ Cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });


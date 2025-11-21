/**
 * Apply PocketBase migrations by creating collections via Admin API
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const PocketBase = require('pocketbase/cjs');
const path = require('path');
const { collections } = require('./001_create_collections');

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

function normalizeCollection(collection, nameToIdMap) {
  const copy = JSON.parse(JSON.stringify(collection));

  copy.schema = (copy.schema || []).map((field) => {
    const normalizedField = { ...field };

    if (normalizedField.type === 'relation') {
      const options = { ...(normalizedField.options || {}) };
      const rawCollection = options.collectionId || normalizedField.collectionId;

      if (rawCollection) {
        options.collectionId = nameToIdMap.get(rawCollection) || rawCollection;
      }
      if (options.cascadeDelete === undefined && normalizedField.cascadeDelete !== undefined) {
        options.cascadeDelete = normalizedField.cascadeDelete;
      }
      if (options.maxSelect === undefined) {
        options.maxSelect = 1;
      }
      if (options.minSelect === undefined) {
        options.minSelect = null;
      }
      if (!options.displayFields) {
        options.displayFields = [];
      }

      delete normalizedField.collectionId;
      delete normalizedField.cascadeDelete;
      normalizedField.options = options;
    }

    return normalizedField;
  });

  return copy;
}

async function applyMigrations() {
  const pb = new PocketBase(PB_URL);

  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated as admin');

    // Get existing collections
    const existingCollections = await pb.collections.getFullList();
    const existingNames = new Set(existingCollections.map((c) => c.name));
    const nameToId = new Map(existingCollections.map((c) => [c.name, c.id]));

    console.log(`\n📦 Creating ${collections.length} collections...`);

    for (const collectionDef of collections) {
      if (existingNames.has(collectionDef.name)) {
        console.log(`⏭️  Collection "${collectionDef.name}" already exists, skipping...`);
        continue;
      }

      try {
        // Create collection
        const normalizedDef = normalizeCollection(collectionDef, nameToId);
        const collection = await pb.collections.create(normalizedDef);
        console.log(`✅ Created collection: ${collectionDef.name}`);
        nameToId.set(collectionDef.name, collection.id);

        // Create indexes if they exist
        if (collectionDef.indexes && collectionDef.indexes.length > 0) {
          for (const indexSql of collectionDef.indexes) {
            try {
              // Note: PocketBase doesn't have a direct API for creating indexes
              // Indexes are typically created via SQL in migrations
              // For now, we'll skip index creation as it requires direct DB access
              console.log(`   ℹ️  Index: ${indexSql.substring(0, 50)}... (requires manual creation)`);
            } catch (err) {
              console.warn(`   ⚠️  Could not create index: ${err.message}`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Failed to create collection "${collectionDef.name}":`, error.message);
        if (error.response?.data) {
          console.error('   Details:', error.response.data);
        }
      }
    }

    console.log('\n🎉 Migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.response?.data) {
      console.error('Details:', error.response.data);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  applyMigrations().catch(console.error);
}

module.exports = { applyMigrations };

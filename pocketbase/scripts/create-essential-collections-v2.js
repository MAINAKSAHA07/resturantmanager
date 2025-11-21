/**
 * Create essential collections for menu management
 * Creates: location, menuCategory, menuItem
 * Uses the exact format from the migration file
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function createCollections() {
  const pb = new PocketBase(PB_URL);

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated as admin');

    // Get all existing collections
    const existing = await pb.collections.getFullList();
    const existingNames = new Set(existing.map(c => c.name));
    console.log('Existing collections:', Array.from(existingNames).join(', '));

    // Create location collection (with relation from start)
    if (!existingNames.has('location')) {
      console.log('\n📦 Creating location collection...');
      try {
        const locationCollection = await pb.collections.create({
          name: 'location',
          type: 'base',
          schema: [
            {
              name: 'tenantId',
              type: 'relation',
              required: true,
              collectionId: 'tenant',
              cascadeDelete: false,
            },
            { name: 'name', type: 'text', required: true },
            { name: 'stateCode', type: 'text', required: true },
            { name: 'gstin', type: 'text', required: true },
            { name: 'address', type: 'json', required: false, options: { maxSize: 2000000 } },
            { name: 'hours', type: 'json', required: false, options: { maxSize: 2000000 } },
          ],
          listRule: '',
          viewRule: '',
          createRule: '',
          updateRule: '',
          deleteRule: '',
        });
        console.log('✅ Created location collection, ID:', locationCollection.id);
      } catch (error) {
        console.error('❌ Failed to create location:', error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    } else {
      console.log('✅ Location collection already exists');
    }

    // Refresh collections list
    const allCollections = await pb.collections.getFullList();
    const locationExists = allCollections.some(c => c.name === 'location');

    // Create menuCategory collection
    if (!existingNames.has('menuCategory')) {
      console.log('\n📦 Creating menuCategory collection...');
      try {
        const menuCategoryCollection = await pb.collections.create({
          name: 'menuCategory',
          type: 'base',
          schema: [
            {
              name: 'tenantId',
              type: 'relation',
              required: true,
              collectionId: 'tenant',
              cascadeDelete: false,
            },
            {
              name: 'locationId',
              type: 'relation',
              required: true,
              collectionId: 'location',
              cascadeDelete: false,
            },
            { name: 'name', type: 'text', required: true },
            { name: 'sort', type: 'number', required: false, defaultValue: 0 },
          ],
          listRule: '',
          viewRule: '',
          createRule: '',
          updateRule: '',
          deleteRule: '',
        });
        console.log('✅ Created menuCategory collection, ID:', menuCategoryCollection.id);
      } catch (error) {
        console.error('❌ Failed to create menuCategory:', error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    } else {
      console.log('✅ menuCategory collection already exists');
    }

    // Refresh collections list
    const updatedCollections = await pb.collections.getFullList();
    const menuCategoryExists = updatedCollections.some(c => c.name === 'menuCategory');

    // Create menuItem collection
    if (!existingNames.has('menuItem')) {
      console.log('\n📦 Creating menuItem collection...');
      try {
        const menuItemCollection = await pb.collections.create({
          name: 'menuItem',
          type: 'base',
          schema: [
            {
              name: 'tenantId',
              type: 'relation',
              required: true,
              collectionId: 'tenant',
              cascadeDelete: false,
            },
            {
              name: 'locationId',
              type: 'relation',
              required: true,
              collectionId: 'location',
              cascadeDelete: false,
            },
            {
              name: 'categoryId',
              type: 'relation',
              required: true,
              collectionId: 'menuCategory',
              cascadeDelete: false,
            },
            { name: 'name', type: 'text', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'basePrice', type: 'number', required: true },
            { name: 'taxRate', type: 'number', required: true, defaultValue: 5 },
            { name: 'hsnSac', type: 'text', required: false },
            { name: 'isActive', type: 'bool', required: true, defaultValue: true },
          ],
          listRule: '',
          viewRule: '',
          createRule: '',
          updateRule: '',
          deleteRule: '',
        });
        console.log('✅ Created menuItem collection, ID:', menuItemCollection.id);
      } catch (error) {
        console.error('❌ Failed to create menuItem:', error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    } else {
      console.log('✅ menuItem collection already exists');
    }

    console.log('\n🎉 Essential collections created successfully!');
    console.log('You can now create categories and menu items in the backoffice.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  createCollections().catch(console.error);
}

module.exports = { createCollections };


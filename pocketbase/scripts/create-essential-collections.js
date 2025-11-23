/**
 * Create essential collections for menu management
 * Creates: location, menuCategory, menuItem
 * Uses collection IDs in options object (this is the correct format)
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

    // Get tenant collection ID
    const tenantCollection = existing.find(c => c.name === 'tenant');
    if (!tenantCollection) {
      throw new Error('tenant collection must exist first. Please create it or run the seed script.');
    }
    const tenantCollectionId = tenantCollection.id;
    console.log('\n📦 Tenant collection ID:', tenantCollectionId);

    // Create location collection
    let locationCollectionId;
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
              options: {
                collectionId: tenantCollectionId,
                cascadeDelete: false,
              },
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
        locationCollectionId = locationCollection.id;
        console.log('✅ Created location collection, ID:', locationCollectionId);
      } catch (error) {
        console.error('❌ Failed to create location:', error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    } else {
      const locationCollection = existing.find(c => c.name === 'location');
      locationCollectionId = locationCollection.id;
      console.log('✅ Location collection already exists, ID:', locationCollectionId);
    }

    // Refresh collections list
    const allCollections = await pb.collections.getFullList();

    // Create menuCategory collection
    let menuCategoryCollectionId;
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
              options: {
                collectionId: tenantCollectionId,
                cascadeDelete: false,
              },
            },
            {
              name: 'locationId',
              type: 'relation',
              required: true,
              options: {
                collectionId: locationCollectionId,
                cascadeDelete: false,
              },
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
        menuCategoryCollectionId = menuCategoryCollection.id;
        console.log('✅ Created menuCategory collection, ID:', menuCategoryCollectionId);
      } catch (error) {
        console.error('❌ Failed to create menuCategory:', error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    } else {
      const menuCategoryCollection = allCollections.find(c => c.name === 'menuCategory');
      menuCategoryCollectionId = menuCategoryCollection?.id;
      console.log('✅ menuCategory collection already exists');
    }

    // Refresh collections list
    const updatedCollections = await pb.collections.getFullList();

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
              options: {
                collectionId: tenantCollectionId,
                cascadeDelete: false,
              },
            },
            {
              name: 'locationId',
              type: 'relation',
              required: true,
              options: {
                collectionId: locationCollectionId,
                cascadeDelete: false,
              },
            },
            {
              name: 'categoryId',
              type: 'relation',
              required: true,
              options: {
                collectionId: menuCategoryCollectionId,
                cascadeDelete: false,
              },
            },
            { name: 'name', type: 'text', required: true },
            { name: 'description', type: 'text', required: false },
            {
              name: 'image',
              type: 'file',
              required: false,
              options: {
                maxSelect: 1,
                maxSize: 5242880, // 5MB
                mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
              },
            },
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

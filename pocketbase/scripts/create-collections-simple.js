/**
 * Simple script to create essential collections for menu management
 * This creates collections with minimal access rules that can be updated later
 */

// Load environment variables
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

    // Check existing collections
    const existing = await pb.collections.getFullList();
    const existingNames = new Set(existing.map(c => c.name));
    console.log('Existing collections:', Array.from(existingNames).join(', '));

    // Get tenant collection ID
    const tenantCollection = existing.find(c => c.name === 'tenant');
    if (!tenantCollection) {
      throw new Error('tenant collection must exist first');
    }
    const tenantCollectionId = tenantCollection.id;
    console.log('Tenant collection ID:', tenantCollectionId);

    // Create location collection
    let locationCollectionId;
    if (!existingNames.has('location')) {
      console.log('\n📦 Creating location collection...');
      const locationCollection = await pb.collections.create({
        name: 'location',
        type: 'base',
        schema: [
          { name: 'tenantId', type: 'relation', required: true, collectionId: tenantCollectionId },
          { name: 'name', type: 'text', required: true },
          { name: 'stateCode', type: 'text', required: true },
          { name: 'gstin', type: 'text', required: true },
          { name: 'address', type: 'json', required: false },
          { name: 'hours', type: 'json', required: false },
        ],
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
      });
      locationCollectionId = locationCollection.id;
      console.log('✅ Created location, ID:', locationCollectionId);
    } else {
      const locationCollection = existing.find(c => c.name === 'location');
      locationCollectionId = locationCollection.id;
      console.log('✅ Location collection already exists');
    }

    // Create menuCategory collection
    let menuCategoryCollectionId;
    if (!existingNames.has('menuCategory')) {
      console.log('\n📦 Creating menuCategory collection...');
      const menuCategoryCollection = await pb.collections.create({
        name: 'menuCategory',
        type: 'base',
        schema: [
          { name: 'tenantId', type: 'relation', required: true, collectionId: tenantCollectionId },
          { name: 'locationId', type: 'relation', required: true, collectionId: locationCollectionId },
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
      console.log('✅ Created menuCategory, ID:', menuCategoryCollectionId);
    } else {
      const menuCategoryCollection = existing.find(c => c.name === 'menuCategory');
      menuCategoryCollectionId = menuCategoryCollection.id;
      console.log('✅ menuCategory collection already exists');
    }

    // Create menuItem collection
    if (!existingNames.has('menuItem')) {
      console.log('\n📦 Creating menuItem collection...');
      await pb.collections.create({
        name: 'menuItem',
        type: 'base',
        schema: [
          { name: 'tenantId', type: 'relation', required: true, collectionId: tenantCollectionId },
          { name: 'locationId', type: 'relation', required: true, collectionId: locationCollectionId },
          { name: 'categoryId', type: 'relation', required: true, collectionId: menuCategoryCollectionId },
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
      console.log('✅ Created menuItem');
    } else {
      console.log('✅ menuItem collection already exists');
    }

    console.log('\n🎉 Essential collections created!');
    console.log('You can now create categories and menu items.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
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

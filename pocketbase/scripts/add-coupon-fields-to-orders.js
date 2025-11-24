/**
 * Script to add couponId and discountAmount fields to orders collection
 * Run with: node pocketbase/scripts/add-coupon-fields-to-orders.js
 * 
 * Usage:
 *   AWS_POCKETBASE_URL=http://your-aws-url:8090 PB_ADMIN_EMAIL=email PB_ADMIN_PASSWORD=password node pocketbase/scripts/add-coupon-fields-to-orders.js
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function addCouponFieldsToOrders() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ Error: PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    console.log(`📍 Using PocketBase URL: ${PB_URL}`);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    console.log('📋 Checking orders collection schema...');
    const collection = await pb.collections.getOne('orders');
    
    console.log('📊 Current fields in orders collection:');
    collection.schema.forEach(field => {
      console.log(`   - ${field.name} (${field.type})`);
    });
    
    // Check if fields already exist
    const hasCouponId = collection.schema.some(field => field.name === 'couponId');
    const hasDiscountAmount = collection.schema.some(field => field.name === 'discountAmount');
    
    console.log(`\n🔍 Field check:`);
    console.log(`   - couponId: ${hasCouponId ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   - discountAmount: ${hasDiscountAmount ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (hasCouponId && hasDiscountAmount) {
      console.log('\n✅ Both coupon fields already exist!');
      return;
    }

    // Get coupon collection ID if it exists
    let couponCollectionId = null;
    try {
      const couponCollection = await pb.collections.getOne('coupon');
      couponCollectionId = couponCollection.id;
      console.log(`\n✅ Found coupon collection, ID: ${couponCollectionId}`);
    } catch (error) {
      console.log('\n⚠️  Coupon collection not found. Please create it first: npm run pb:create-coupon-collection');
    }

    // Prepare updated schema
    const updatedSchema = [...collection.schema];
    
    if (!hasCouponId) {
      console.log('\n🔧 Adding couponId field...');
      if (couponCollectionId) {
        updatedSchema.push({
          name: 'couponId',
          type: 'relation',
          required: false,
          options: {
            collectionId: couponCollectionId,
            cascadeDelete: false,
          },
        });
      } else {
        console.log('⚠️  Skipping couponId field - coupon collection not found');
      }
    }
    
    if (!hasDiscountAmount) {
      console.log('🔧 Adding discountAmount field...');
      updatedSchema.push({
        name: 'discountAmount',
        type: 'number',
        required: false,
        defaultValue: 0,
      });
    }
    
    if (updatedSchema.length > collection.schema.length) {
      console.log('\n📝 Updating orders collection schema...');
      await pb.collections.update(collection.id, {
        name: collection.name,
        type: collection.type,
        schema: updatedSchema,
        listRule: collection.listRule || '',
        viewRule: collection.viewRule || '',
        createRule: collection.createRule || '',
        updateRule: collection.updateRule || '',
        deleteRule: collection.deleteRule || '',
      });
      
      console.log('✅ Successfully updated orders collection!');
      console.log('\n📋 Updated schema:');
      const updatedCollection = await pb.collections.getOne('orders');
      updatedCollection.schema.forEach(field => {
        console.log(`   - ${field.name} (${field.type})`);
      });
    } else {
      console.log('\n✅ No changes needed');
    }
    
    console.log('\n✅ Script completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.status) {
      console.error('Status:', error.status);
    }
    process.exit(1);
  }
}

addCouponFieldsToOrders()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


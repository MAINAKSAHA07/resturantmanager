/**
 * Script to create coupon collection in PocketBase
 * Run with: node pocketbase/scripts/create-coupon-collection.js
 * 
 * Usage:
 *   AWS_POCKETBASE_URL=http://your-aws-url:8090 PB_ADMIN_EMAIL=email PB_ADMIN_PASSWORD=password node pocketbase/scripts/create-coupon-collection.js
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function createCouponCollection() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    console.log(`📍 Using PocketBase URL: ${PB_URL}`);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    // Get existing collections
    const existing = await pb.collections.getFullList();
    const existingNames = new Set(existing.map(c => c.name));
    
    if (existingNames.has('coupon')) {
      console.log('✅ Coupon collection already exists');
      
      // Check if we need to add fields
      const couponCollection = existing.find(c => c.name === 'coupon');
      const hasDiscountAmount = couponCollection?.schema?.some(f => f.name === 'discountAmount');
      const hasDiscountType = couponCollection?.schema?.some(f => f.name === 'discountType');
      
      if (!hasDiscountAmount || !hasDiscountType) {
        console.log('⚠️  Coupon collection exists but may be missing fields. Please check manually.');
      }
      return;
    }

    // Get tenant collection ID for relation
    const tenantCollection = existing.find(c => c.name === 'tenant');
    if (!tenantCollection) {
      throw new Error('tenant collection must exist first. Run: npm run pb:create-collections');
    }
    const tenantCollectionId = tenantCollection.id;

    console.log('📦 Creating coupon collection...');
    
    const couponCollection = await pb.collections.create({
      name: 'coupon',
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
          name: 'code',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          required: false,
        },
        {
          name: 'discountType',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['percentage', 'fixed'],
          },
        },
        {
          name: 'discountValue',
          type: 'number',
          required: true,
        },
        {
          name: 'minOrderAmount',
          type: 'number',
          required: false,
          defaultValue: 0,
        },
        {
          name: 'maxDiscountAmount',
          type: 'number',
          required: false,
        },
        {
          name: 'validFrom',
          type: 'date',
          required: true,
        },
        {
          name: 'validUntil',
          type: 'date',
          required: true,
        },
        {
          name: 'usageLimit',
          type: 'number',
          required: false,
        },
        {
          name: 'usedCount',
          type: 'number',
          required: true,
          defaultValue: 0,
        },
        {
          name: 'isActive',
          type: 'bool',
          required: true,
          defaultValue: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_coupon_code_tenant` ON `coupon` (`code`, `tenantId`)',
        'CREATE INDEX `idx_coupon_tenant_active` ON `coupon` (`tenantId`, `isActive`)',
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    });

    console.log('✅ Created coupon collection, ID:', couponCollection.id);
    console.log('\n📋 Coupon collection schema:');
    couponCollection.schema.forEach(field => {
      console.log(`   - ${field.name} (${field.type})`);
    });

  } catch (error) {
    console.error('❌ Error creating coupon collection:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createCouponCollection()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


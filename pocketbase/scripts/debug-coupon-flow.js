/**
 * Script to debug coupon flow
 * Run with: node pocketbase/scripts/debug-coupon-flow.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function debugCouponFlow() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔐 Authenticating as admin...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        // 1. Get a tenant
        const tenants = await pb.collection('tenant').getList(1, 1);
        if (tenants.items.length === 0) throw new Error('No tenants found');
        const tenant = tenants.items[0];
        console.log(`📍 Using tenant: ${tenant.id} (${tenant.name})`);

        // 2. Get or create a test coupon
        let coupon;
        try {
            const coupons = await pb.collection('coupon').getList(1, 1, {
                filter: `tenantId = "${tenant.id}"`,
                sort: '-created'
            });

            if (coupons.items.length > 0) {
                coupon = coupons.items[0];
                console.log(`🎫 Found existing coupon: ${coupon.code} (${coupon.id})`);
            } else {
                console.log('➕ Creating test coupon...');
                coupon = await pb.collection('coupon').create({
                    tenantId: tenant.id,
                    code: 'TEST' + Date.now(),
                    discountType: 'percentage',
                    discountValue: 1000, // 10%
                    validFrom: new Date().toISOString(),
                    validUntil: new Date(Date.now() + 86400000).toISOString(),
                    usedCount: 0,
                    isActive: true
                });
                console.log(`✅ Created test coupon: ${coupon.code}`);
            }
        } catch (e) {
            console.error('❌ Error getting/creating coupon:', e);
            throw e;
        }

        // 3. Test updating usedCount
        console.log(`🔄 Testing usedCount update for coupon ${coupon.id}...`);
        console.log(`   Current usedCount: ${coupon.usedCount} (Type: ${typeof coupon.usedCount})`);

        try {
            const updatedCoupon = await pb.collection('coupon').update(coupon.id, {
                usedCount: (coupon.usedCount || 0) + 1
            });
            console.log(`✅ Updated usedCount to: ${updatedCoupon.usedCount}`);
        } catch (e) {
            console.error('❌ Failed to update coupon usedCount:', e);
            // Print detailed error
            if (e.response) console.error('   Response:', JSON.stringify(e.response, null, 2));
        }

        // 4. Test creating an order with this coupon
        console.log('📦 Testing order creation with coupon...');

        // Get a location
        const locations = await pb.collection('location').getList(1, 1, {
            filter: `tenantId = "${tenant.id}"` // simplified filter
        });
        // If filter fails, just get any location
        const location = locations.items.length > 0 ? locations.items[0] : (await pb.collection('location').getList(1, 1)).items[0];

        if (!location) throw new Error('No location found');

        const orderData = {
            tenantId: tenant.id,
            locationId: location.id,
            channel: 'pickup',
            status: 'placed',
            subtotal: 10000, // ₹100.00
            taxCgst: 250,
            taxSgst: 250,
            taxIgst: 0,
            total: 10500,
            discountAmount: 1000, // ₹10.00
            couponId: coupon.id,
            timestamps: {
                placedAt: new Date().toISOString(),
            },
        };

        console.log('   Order data:', JSON.stringify(orderData, null, 2));

        try {
            const order = await pb.collection('orders').create(orderData);
            console.log(`✅ Order created successfully: ${order.id}`);
            console.log(`   Saved couponId: ${order.couponId}`);
            console.log(`   Saved discountAmount: ${order.discountAmount}`);

            if (order.couponId !== coupon.id) {
                console.error('❌ MISMATCH: Saved couponId does not match!');
            }
            if (order.discountAmount !== 1000) {
                console.error('❌ MISMATCH: Saved discountAmount does not match!');
            }
        } catch (e) {
            console.error('❌ Failed to create order:', e);
            if (e.response) console.error('   Response:', JSON.stringify(e.response, null, 2));
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
}

debugCouponFlow();

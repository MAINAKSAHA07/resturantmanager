/**
 * Script to update couponId field in orders to maxSelect: 1
 * Run with: node pocketbase/scripts/update-order-coupon-schema.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function updateSchema() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔐 Authenticating as admin...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

        const collection = await pb.collections.getOne('orders');
        const schema = collection.schema;

        const couponField = schema.find(f => f.name === 'couponId');
        if (!couponField) {
            console.log('❌ couponId field not found');
            return;
        }

        console.log('Current couponId options:', couponField.options);

        if (couponField.options.maxSelect === 1) {
            console.log('✅ maxSelect is already 1');
            return;
        }

        console.log('🔧 Updating maxSelect to 1...');
        couponField.options.maxSelect = 1;

        await pb.collections.update(collection.id, { schema });
        console.log('✅ Schema updated successfully');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updateSchema();

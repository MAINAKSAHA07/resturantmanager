/**
 * Script to inspect orders collection schema and rules
 * Run with: node pocketbase/scripts/inspect-orders-full.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function inspectOrders() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔐 Authenticating as admin...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

        const collection = await pb.collections.getOne('orders');

        console.log('📋 Collection: orders');
        console.log('   Type:', collection.type);
        console.log('   ID:', collection.id);
        console.log('\n🔒 API Rules:');
        console.log('   List:', collection.listRule);
        console.log('   View:', collection.viewRule);
        console.log('   Create:', collection.createRule);
        console.log('   Update:', collection.updateRule);
        console.log('   Delete:', collection.deleteRule);

        console.log('\n📊 Schema Fields:');
        collection.schema.forEach(field => {
            console.log(`   - ${field.name} (${field.type})`);
            console.log(`     Required: ${field.required}`);
            console.log(`     Options:`, JSON.stringify(field.options));
            console.log('---');
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

inspectOrders();

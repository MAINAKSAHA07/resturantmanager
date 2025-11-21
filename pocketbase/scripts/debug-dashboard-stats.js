const PocketBase = require('pocketbase/cjs');

// Use localhost for now to check local state, or switch to AWS URL if needed
const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function debugStats() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        // 1. Get all tenants
        const tenants = await pb.collection('tenant').getFullList();
        console.log(`\nFound ${tenants.length} tenants:`);
        tenants.forEach(t => console.log(` - ${t.name} (${t.id})`));

        if (tenants.length === 0) {
            console.log('❌ No tenants found!');
            return;
        }

        // 2. Pick the first tenant (or a specific one if we knew it)
        const tenantId = tenants[0].id;
        console.log(`\n🔍 Debugging for tenant: ${tenants[0].name} (${tenantId})`);

        // 3. Check Date logic
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.toISOString();
        console.log(`\n📅 Date Filter: created >= ${todayStart}`);
        console.log(`   Current Server Time: ${new Date().toISOString()}`);

        // 4. Fetch all orders (no filter first)
        console.log('\n📦 Fetching ALL orders (no filter)...');
        const allOrders = await pb.collection('orders').getFullList({
            sort: '-created',
            limit: 10,
        });
        console.log(`   Total orders in DB: ${allOrders.length}`);

        if (allOrders.length > 0) {
            console.log('   Latest 3 orders:');
            allOrders.slice(0, 3).forEach(o => {
                console.log(`   - ID: ${o.id}, Created: ${o.created}, Tenant: ${o.tenantId}, Total: ${o.total}`);
            });
        }

        // 5. Apply API Logic with different formats
        console.log('\n🕵️ Testing Date Formats...');

        const isoDate = today.toISOString();
        const pbDate = isoDate.replace('T', ' ').replace('Z', '');

        console.log(`   1. ISO Format: "${isoDate}"`);
        try {
            const res1 = await pb.collection('orders').getList(1, 1000, {
                filter: `created >= "${isoDate}"`,
            });
            console.log(`      -> Found: ${res1.items.length}`);
        } catch (e) { console.log('      -> Error:', e.message); }

        console.log(`   2. PB Format: "${pbDate}"`);
        try {
            const res2 = await pb.collection('orders').getList(1, 1000, {
                filter: `created >= "${pbDate}"`,
            });
            console.log(`      -> Found: ${res2.items.length}`);
        } catch (e) { console.log('      -> Error:', e.message); }

        // Re-applying original API logic for subsequent calculations
        console.log('\n🕵️ Applying API Logic...');
        const filteredOrders = await pb.collection('orders').getList(1, 1000, {
            filter: `created >= "${todayStart}"`,
            sort: '-created',
        });

        console.log(`   Orders after date filter: ${filteredOrders.items.length}`);

        const tenantOrders = filteredOrders.items.filter((order) => {
            const orderTenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;
            return orderTenantId === tenantId;
        });

        console.log(`   Orders for tenant ${tenantId}: ${tenantOrders.length}`);

        const totalRevenue = tenantOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const completedOrders = tenantOrders.filter((o) => o.status === 'completed').length;

        console.log('\n📊 Calculated Stats:');
        console.log(`   - Today Orders: ${tenantOrders.length}`);
        console.log(`   - Total Revenue: ${totalRevenue}`);
        console.log(`   - Completed Orders: ${completedOrders}`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugStats();

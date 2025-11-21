const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function debugRanges() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        const ranges = ['1d', '7d', '30d'];

        for (const range of ranges) {
            console.log(`\n🔍 Testing Range: ${range}`);

            // Simulate API logic
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);

            if (range === '7d') {
                startDate.setDate(startDate.getDate() - 6);
            } else if (range === '30d') {
                startDate.setDate(startDate.getDate() - 29);
            }

            const filterDate = startDate.toISOString().replace('T', ' ').replace('Z', '');
            console.log(`   Filter Date: >= "${filterDate}"`);

            try {
                const result = await pb.collection('orders').getList(1, 1000, {
                    filter: `created >= "${filterDate}"`,
                    sort: '-created',
                });
                console.log(`   Found: ${result.items.length} orders`);
                if (result.items.length > 0) {
                    const oldest = result.items[result.items.length - 1];
                    console.log(`   Oldest Order: ${oldest.created}`);
                }
            } catch (e) {
                console.log('   ❌ Error:', e.message);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugRanges();

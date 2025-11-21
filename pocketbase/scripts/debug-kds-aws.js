const PocketBase = require('pocketbase/cjs');

// Use AWS URL
const PB_URL = 'http://18.218.140.182:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function checkKDS() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        console.log('📋 Checking kdsTicket collection...');
        try {
            const collection = await pb.collections.getOne('kdsTicket');
            console.log('✅ kdsTicket collection exists!');
            console.log('   Schema:', JSON.stringify(collection.schema, null, 2));

            const tickets = await pb.collection('kdsTicket').getList(1, 5);
            console.log(`   Found ${tickets.totalItems} tickets`);

        } catch (e) {
            if (e.status === 404) {
                console.log('❌ kdsTicket collection DOES NOT exist!');
            } else {
                console.log('❌ Error fetching collection:', e.message);
            }
        }

    } catch (error) {
        console.error('❌ Connection Error:', error.message);
    }
}

checkKDS();

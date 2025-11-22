const PocketBase = require('pocketbase/cjs');

// Use AWS URL
const PB_URL = 'http://18.218.140.182:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function checkUsersSchema() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        console.log('📋 Checking users collection...');
        try {
            const collection = await pb.collections.getOne('users');
            console.log('   Schema:', JSON.stringify(collection.schema, null, 2));

            // Check for specific user
            const userEmail = 'mainak.tln@gmail.com';
            try {
                const user = await pb.collection('users').getFirstListItem(`email="${userEmail}"`);
                console.log(`   Found user ${userEmail}:`, user);
            } catch (e) {
                console.log(`   User ${userEmail} not found.`);
            }

        } catch (e) {
            console.error('❌ Error fetching collection:', e.message);
        }

    } catch (error) {
        console.error('❌ Connection Error:', error.message);
    }
}

checkUsersSchema();

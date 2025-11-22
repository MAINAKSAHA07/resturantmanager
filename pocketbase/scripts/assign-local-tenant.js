const PocketBase = require('pocketbase/cjs');

// Use LOCAL URL
const PB_URL = 'http://localhost:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function assignTenantToUser() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        // 1. Find user
        const userEmail = 'mainak.tln@gmail.com';
        console.log(`\n🔍 Finding user: ${userEmail}...`);

        try {
            const user = await pb.collection('users').getFirstListItem(`email="${userEmail}"`);
            console.log(`   ✅ Found user: ${user.id}`);
            console.log(`   Current role: ${user.role || 'none'}`);
            console.log(`   Current tenants: ${JSON.stringify(user.tenants || [])}`);

            // 2. Find a tenant (any tenant)
            console.log('\n🔍 Finding available tenants...');
            const tenants = await pb.collection('tenant').getFullList();

            if (tenants.length === 0) {
                console.log('   ❌ No tenants found in database');
                return;
            }

            console.log(`   Found ${tenants.length} tenants:`);
            tenants.forEach(t => console.log(`   - ${t.name} (${t.id})`));

            // 3. Assign first tenant to user
            const firstTenant = tenants[0];
            console.log(`\n👤 Assigning "${firstTenant.name}" to ${userEmail}...`);

            await pb.collection('users').update(user.id, {
                role: 'manager',
                tenants: [firstTenant.id]
            });

            console.log('   ✅ User updated successfully!');

            // 4. Verify
            const updatedUser = await pb.collection('users').getOne(user.id, {
                expand: 'tenants'
            });

            console.log('\n✅ Verification:');
            console.log(`   Email: ${updatedUser.email}`);
            console.log(`   Role: ${updatedUser.role}`);
            console.log(`   Tenants: ${updatedUser.expand?.tenants?.map(t => t.name).join(', ')}`);

            console.log('\n📝 You can now log in with:');
            console.log(`   Email: ${userEmail}`);
            console.log(`   Password: <your password>`);

        } catch (e) {
            console.error(`   ❌ User ${userEmail} not found`);
            console.error('   Error:', e.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

assignTenantToUser();

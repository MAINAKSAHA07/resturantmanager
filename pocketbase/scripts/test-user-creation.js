const PocketBase = require('pocketbase/cjs');

// Use AWS URL
const PB_URL = 'http://18.218.140.182:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function testUserCreation() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        // 1. Get Saffron Tenant
        console.log('\n🔍 Finding Saffron tenant...');
        const tenants = await pb.collection('tenant').getFullList({
            filter: 'name ~ "saffron"'
        });

        if (tenants.length === 0) {
            console.log('   ❌ Saffron tenant not found');
            return;
        }

        const saffronTenant = tenants[0];
        console.log(`   ✅ Found: ${saffronTenant.name} (${saffronTenant.id})`);

        // 2. Create Test User with Tenant
        const testEmail = `test.user.${Date.now()}@example.com`;
        console.log(`\n👤 Creating test user: ${testEmail}...`);

        const userData = {
            email: testEmail,
            emailVisibility: true,
            password: 'password123',
            passwordConfirm: 'password123',
            name: 'Test User',
            role: 'staff',
            tenants: [saffronTenant.id]
        };

        console.log('   Sending data:', JSON.stringify(userData, null, 2));

        try {
            const newUser = await pb.collection('users').create(userData);
            console.log('   ✅ User created:', newUser.id);

            // 3. Verify User
            console.log('\n🔍 Verifying user...');
            const verifyUser = await pb.collection('users').getOne(newUser.id, {
                expand: 'tenants'
            });

            console.log('   User details:');
            console.log('   - Email:', verifyUser.email);
            console.log('   - Role:', verifyUser.role);
            console.log('   - Tenants (raw):', verifyUser.tenants);
            console.log('   - Tenants (expanded):', verifyUser.expand?.tenants?.map(t => t.name));

            // 4. Cleanup
            console.log('\n🧹 Cleaning up...');
            await pb.collection('users').delete(newUser.id);
            console.log('   ✅ Test user deleted');

        } catch (createError) {
            console.error('   ❌ Error creating user:', createError.message);
            if (createError.data) {
                console.error('   Error data:', JSON.stringify(createError.data, null, 2));
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testUserCreation();

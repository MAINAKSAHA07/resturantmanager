const PocketBase = require('pocketbase/cjs');

// Use AWS URL
const PB_URL = 'http://18.218.140.182:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function verifyRbacApi() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated as Admin');

        // 1. List Users
        console.log('\n📋 Listing Users...');
        const users = await pb.collection('users').getFullList();
        console.log(`   Found ${users.length} users`);
        users.forEach(u => console.log(`   - ${u.email} (${u.role || 'no role'})`));

        // 2. Create Test User
        const testEmail = `test.staff.${Date.now()}@example.com`;
        console.log(`\n👤 Creating Test User: ${testEmail}...`);
        const newUser = await pb.collection('users').create({
            email: testEmail,
            emailVisibility: true,
            password: 'password123',
            passwordConfirm: 'password123',
            name: 'Test Staff',
            role: 'staff'
        });
        console.log('   ✅ Created user:', newUser.id);

        // 3. Update Test User
        console.log('\n✏️ Updating Test User Role to Manager...');
        const updatedUser = await pb.collection('users').update(newUser.id, {
            role: 'manager'
        });
        console.log(`   ✅ Updated role: ${updatedUser.role}`);

        // 4. Cleanup
        console.log('\n🧹 Cleaning up...');
        await pb.collection('users').delete(newUser.id);
        console.log('   ✅ Deleted test user');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.data) console.error('   Data:', JSON.stringify(error.data, null, 2));
    }
}

verifyRbacApi();

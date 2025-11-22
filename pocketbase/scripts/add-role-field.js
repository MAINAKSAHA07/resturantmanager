const PocketBase = require('pocketbase/cjs');

// Use AWS URL
const PB_URL = 'http://18.218.140.182:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function addRoleField() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        // 1. Update Schema
        console.log('🛠️ Updating users schema...');
        const collection = await pb.collections.getOne('users');

        // Check if role field exists
        const hasRole = collection.schema.find(f => f.name === 'role');

        if (!hasRole) {
            collection.schema.push({
                name: 'role',
                type: 'select',
                required: true,
                options: {
                    maxSelect: 1,
                    values: ['admin', 'manager', 'staff'],
                },
            });

            await pb.collections.update('users', collection);
            console.log('   ✅ Added "role" field to users schema');
        } else {
            console.log('   ℹ️ "role" field already exists');
        }

        // 2. Update User
        const userEmail = 'mainak.tln@gmail.com';
        console.log(`👤 Updating user ${userEmail}...`);

        try {
            const user = await pb.collection('users').getFirstListItem(`email="${userEmail}"`);

            if (user.role !== 'manager') {
                await pb.collection('users').update(user.id, { role: 'manager' });
                console.log(`   ✅ Updated user ${userEmail} to role "manager"`);
            } else {
                console.log(`   ℹ️ User ${userEmail} is already a manager`);
            }

        } catch (e) {
            console.error(`   ❌ User ${userEmail} not found or error updating:`, e.message);
        }

        // 3. Set default role for others
        console.log('👥 Setting default role "staff" for other users...');
        const users = await pb.collection('users').getFullList();
        for (const u of users) {
            if (!u.role) {
                await pb.collection('users').update(u.id, { role: 'staff' });
                console.log(`   Updated ${u.email} to staff`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

addRoleField();

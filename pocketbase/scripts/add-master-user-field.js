const PocketBase = require('pocketbase/cjs');

// Use AWS URL or local
const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function addMasterUserField() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        // 1. Update Schema
        console.log('🛠️ Updating users schema...');
        const collection = await pb.collections.getOne('users');

        // Check if isMaster field exists
        const hasIsMaster = collection.schema.find(f => f.name === 'isMaster');

        if (!hasIsMaster) {
            collection.schema.push({
                name: 'isMaster',
                type: 'bool',
                required: false,
                options: {},
            });

            await pb.collections.update('users', collection);
            console.log('   ✅ Added "isMaster" field to users schema');
        } else {
            console.log('   ℹ️ "isMaster" field already exists');
        }

        // 2. Set isMaster for existing admin users
        console.log('👤 Setting isMaster=true for admin users...');
        try {
            const adminUsers = await pb.collection('users').getFullList({
                filter: 'role="admin"',
            });

            for (const user of adminUsers) {
                if (!user.isMaster) {
                    await pb.collection('users').update(user.id, { isMaster: true });
                    console.log(`   ✅ Set isMaster=true for ${user.email}`);
                } else {
                    console.log(`   ℹ️ ${user.email} already has isMaster=true`);
                }
            }

            if (adminUsers.length === 0) {
                console.log('   ℹ️ No admin users found');
            }
        } catch (e) {
            console.error(`   ❌ Error updating admin users:`, e.message);
        }

        // 3. Set isMaster=false for all other users
        console.log('👥 Setting isMaster=false for non-admin users...');
        try {
            const nonAdminUsers = await pb.collection('users').getFullList({
                filter: 'role!="admin"',
            });

            for (const user of nonAdminUsers) {
                if (user.isMaster === undefined || user.isMaster === null) {
                    await pb.collection('users').update(user.id, { isMaster: false });
                    console.log(`   ✅ Set isMaster=false for ${user.email}`);
                }
            }

            if (nonAdminUsers.length === 0) {
                console.log('   ℹ️ No non-admin users found');
            }
        } catch (e) {
            console.error(`   ❌ Error updating non-admin users:`, e.message);
        }

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addMasterUserField();


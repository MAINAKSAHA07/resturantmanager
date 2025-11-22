const PocketBase = require('pocketbase/cjs');

// Use LOCAL URL
const PB_URL = 'http://localhost:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function setupLocalRBAC() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        // 1. Add role field to users
        console.log('\n🛠️ Updating users schema with role field...');
        let collection = await pb.collections.getOne('users');

        const hasRole = collection.schema.find(f => f.name === 'role');
        if (!hasRole) {
            collection.schema.push({
                name: 'role',
                type: 'select',
                required: false, // Make it optional first to avoid breaking existing users
                options: {
                    maxSelect: 1,
                    values: ['admin', 'manager', 'staff'],
                },
            });
            await pb.collections.update('users', collection);
            console.log('   ✅ Added "role" field');
        } else {
            console.log('   ℹ️ "role" field already exists');
        }

        // 2. Set default role for existing users
        console.log('\n👥 Setting default role "staff" for existing users...');
        const users = await pb.collection('users').getFullList();
        for (const u of users) {
            if (!u.role) {
                await pb.collection('users').update(u.id, { role: 'staff' });
                console.log(`   Updated ${u.email} to staff`);
            }
        }

        // 3. Add tenants field to users
        console.log('\n🛠️ Updating users schema with tenants field...');
        collection = await pb.collections.getOne('users');
        const hasTenants = collection.schema.find(f => f.name === 'tenants');

        if (!hasTenants) {
            let tenantsCollectionId;
            try {
                const tenantsCol = await pb.collections.getOne('tenant');
                tenantsCollectionId = tenantsCol.id;
                console.log(`   Found tenant collection: ${tenantsCollectionId}`);
            } catch (e) {
                console.log('   ❌ Could not find "tenant" collection');
                return;
            }

            collection.schema.push({
                name: 'tenants',
                type: 'relation',
                required: false,
                options: {
                    collectionId: tenantsCollectionId,
                    cascadeDelete: false,
                    minSelect: null,
                    maxSelect: null,
                    displayFields: null
                },
            });

            try {
                await pb.collections.update('users', collection);
                console.log('   ✅ Added "tenants" field');
            } catch (updateError) {
                console.error('   ❌ Error updating collection:', updateError.message);
                if (updateError.data) {
                    console.error('   Error details:', JSON.stringify(updateError.data, null, 2));
                }
                return;
            }
        } else {
            console.log('   ℹ️ "tenants" field already exists');
        }

        console.log('\n✅ Local RBAC setup complete!');
        console.log('\n📝 Next steps:');
        console.log('   1. Start your local dev server: make dev');
        console.log('   2. Navigate to http://localhost:3001/users');
        console.log('   3. Test creating a new user with role and tenant assignment');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.data) {
            console.error('Error details:', JSON.stringify(error.data, null, 2));
        }
    }
}

setupLocalRBAC();

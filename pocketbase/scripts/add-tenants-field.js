const PocketBase = require('pocketbase/cjs');

// Use AWS URL
const PB_URL = 'http://18.218.140.182:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function addTenantsField() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        // 1. Update Schema
        console.log('🛠️ Updating users schema...');
        const collection = await pb.collections.getOne('users');

        // Check if tenants field exists
        const hasTenants = collection.schema.find(f => f.name === 'tenants');

        if (!hasTenants) {
            console.log('   Fetching tenants collection ID...');
            let tenantsCollectionId;
            try {
                const tenantsCol = await pb.collections.getOne('tenants');
                tenantsCollectionId = tenantsCol.id;
            } catch (e) {
                console.log('   ⚠️ Could not find "tenants" collection. Trying "tenant"...');
                try {
                    const tenantsCol = await pb.collections.getOne('tenant');
                    tenantsCollectionId = tenantsCol.id;
                } catch (e2) {
                    throw new Error('Could not find tenants collection (tried "tenants" and "tenant")');
                }
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
                    displayFields: []
                },
            });

            await pb.collections.update('users', collection);
            console.log('   ✅ Added "tenants" field to users schema');
        } else {
            console.log('   ℹ️ "tenants" field already exists');
        }

        // 2. Find Saffron Tenant
        console.log('🔍 Finding Saffron tenant...');
        const tenants = await pb.collection('tenant').getFullList({
            filter: 'name ~ "saffron"'
        });

        if (tenants.length === 0) {
            console.log('   ⚠️ Saffron tenant not found. Listing all tenants:');
            const allTenants = await pb.collection('tenant').getFullList();
            allTenants.forEach(t => console.log(`   - ${t.name} (${t.id})`));
            return;
        }

        const saffronTenant = tenants[0];
        console.log(`   ✅ Found Saffron tenant: ${saffronTenant.name} (${saffronTenant.id})`);

        // 3. Update User
        const userEmail = 'mainak.tln@gmail.com';
        console.log(`👤 Updating user ${userEmail}...`);

        try {
            const user = await pb.collection('users').getFirstListItem(`email="${userEmail}"`);

            // Add tenant if not already present
            const currentTenants = user.tenants || [];
            if (!currentTenants.includes(saffronTenant.id)) {
                await pb.collection('users').update(user.id, {
                    tenants: [...currentTenants, saffronTenant.id]
                });
                console.log(`   ✅ Added Saffron tenant to user ${userEmail}`);
            } else {
                console.log(`   ℹ️ User ${userEmail} already has access to Saffron`);
            }

        } catch (e) {
            console.error(`   ❌ User ${userEmail} not found or error updating:`, e.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

addTenantsField();

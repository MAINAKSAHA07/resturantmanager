const PocketBase = require('pocketbase/cjs');

// Force localhost
const PB_URL = 'http://localhost:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function addAvailabilityField() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        console.log('🔐 Authenticating as admin...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated successfully\n');

        console.log('📋 Getting menuItem collection...');
        const collection = await pb.collections.getOne('menuItem');

        // Check if field already exists
        console.log('Current schema fields:', collection.schema.map(f => f.name));
        const hasAvailability = collection.schema.some(field => field.name === 'availability');

        if (hasAvailability) {
            console.log('✅ availability field already exists in the schema!');
            return;
        }

        console.log('⚠️  availability field does not exist. Attempting to add...\n');

        try {
            const updatedSchema = [
                ...collection.schema,
                {
                    name: 'availability',
                    type: 'text',
                    required: true,
                    options: {
                        min: null,
                        max: null,
                        pattern: '',
                    },
                }
            ];

            await pb.collections.update('menuItem', {
                schema: updatedSchema,
            });

            console.log('✅ Successfully added availability field to schema!');

        } catch (error) {
            console.log('❌ Could not add field programmatically:', error.message);
            throw error;
        }

        // After adding the field, migrate existing data
        console.log('\n🔄 Migrating existing items...');
        const allItems = await pb.collection('menuItem').getFullList({
            batch: 500,
        });

        let updated = 0;
        for (const item of allItems) {
            try {
                if (!item.availability || (item.availability !== 'available' && item.availability !== 'not available')) {
                    const availability = item.isActive !== false ? 'available' : 'not available';
                    await pb.collection('menuItem').update(item.id, {
                        availability: availability,
                    });
                    updated++;
                }
            } catch (error) {
                console.error(`   Error updating ${item.name}:`, error.message);
            }
        }

        console.log(`✅ Updated ${updated} items with availability field`);
        console.log('\n✅ Setup complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addAvailabilityField();

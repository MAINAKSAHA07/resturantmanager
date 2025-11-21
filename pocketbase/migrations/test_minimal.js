const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123456';

async function run() {
    const pb = new PocketBase(PB_URL);
    try {
        console.log('Authenticating...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

        console.log('Creating test collection...');
        await pb.collections.create({
            name: 'test_col_' + Date.now(),
            type: 'base',
            schema: [
                { name: 'key', type: 'text', required: true }
            ],
            indexes: [
                `CREATE UNIQUE INDEX idx_key_${Date.now()} ON {{tableName}} (key)`
            ]

        });
        console.log('✅ Success');
    } catch (e) {
        console.log('❌ Failed');
        console.log(JSON.stringify(e.response, null, 2));
    }
}

run();

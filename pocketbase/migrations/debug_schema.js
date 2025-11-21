const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://localhost:8090');

async function run() {
    try {
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');

        const collections = ['menuItem', 'tenant'];
        for (const name of collections) {
            try {
                const col = await pb.collections.getOne(name);
                console.log(`=== ${name} ===`);
                console.log(JSON.stringify(col, null, 2));
            } catch (e) {
                console.log(`Failed to fetch ${name}:`, e.message);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();

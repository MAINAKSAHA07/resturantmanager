const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://localhost:8090');

async function run() {
    try {
        await pb.admins.authWithPassword('mainaksaha0807@gmail.com', '8104760831');

        const collections = ['menuItem', 'tenant'];
        for (const name of collections) {
            try {
                const col = await pb.collections.getOne(name);
                console.log(`=== ${name} ===`);
                console.log(JSON.stringify(col.schema, null, 2));
            } catch (e) {
                console.log(`Failed to fetch ${name}:`, e.message);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();

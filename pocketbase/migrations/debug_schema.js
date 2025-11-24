const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://localhost:8090');

async function run() {
    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL;
        const adminPassword = process.env.PB_ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword) {
            throw new Error('PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set in environment variables');
        }
        await pb.admins.authWithPassword(adminEmail, adminPassword);

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

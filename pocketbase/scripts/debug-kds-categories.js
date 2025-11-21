const PocketBase = require('pocketbase/cjs');

// Use AWS URL
const PB_URL = 'http://18.218.140.182:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function checkCategories() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        console.log('📋 Fetching Menu Categories...');
        const categories = await pb.collection('menuCategory').getFullList();

        console.log('   Found categories:');
        categories.forEach(c => {
            console.log(`   - ID: ${c.id}, Name: "${c.name}"`);
        });

        console.log('\n📋 Testing Station Logic...');
        categories.forEach(c => {
            const categoryName = c.name.toLowerCase();
            let itemStation = 'default';
            if (categoryName.includes('beverage') || categoryName.includes('drink') || categoryName.includes('bar') || categoryName.includes('juice') || categoryName.includes('coffee') || categoryName.includes('tea')) {
                itemStation = 'bar';
            } else if (categoryName.includes('salad') || categoryName.includes('cold') || (categoryName.includes('appetizer') && categoryName.includes('cold'))) {
                itemStation = 'cold';
            } else if (categoryName.includes('main') || categoryName.includes('entree') || categoryName.includes('hot') || categoryName.includes('appetizer') || categoryName.includes('dessert')) {
                itemStation = 'hot';
            }
            console.log(`   "${c.name}" -> ${itemStation}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkCategories();

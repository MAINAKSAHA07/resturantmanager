const PocketBase = require('pocketbase/cjs');

// Use AWS URL
const PB_URL = 'http://18.218.140.182:8090';
const ADMIN_EMAIL = 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = '8104760831';

async function generateTickets() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔌 Connecting to:', PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated');

        // 1. Update schema to make priority optional (fix validation error)
        console.log('🛠️ Updating schema to make priority optional...');
        try {
            const collection = await pb.collections.getOne('kdsTicket');
            const priorityField = collection.schema.find(f => f.name === 'priority');
            if (priorityField && priorityField.required) {
                priorityField.required = false;
                await pb.collections.update('kdsTicket', collection);
                console.log('   ✅ Schema updated: priority is now optional');
            } else {
                console.log('   ℹ️ Schema already correct');
            }
        } catch (e) {
            console.error('   ❌ Error updating schema:', e.message);
        }

        // Get active orders (accepted, in_kitchen)
        console.log('📦 Fetching active orders...');
        const orders = await pb.collection('orders').getFullList({
            filter: 'status = "accepted" || status = "in_kitchen"',
            sort: '-created',
        });

        console.log(`   Found ${orders.length} active orders`);

        let created = 0;

        for (const order of orders) {
            try {
                // Check if ticket exists
                const existing = await pb.collection('kdsTicket').getList(1, 1, {
                    filter: `orderId = "${order.id}"`,
                });

                let isUpdate = false;
                let existingTicketId = null;

                if (existing.totalItems > 0) {
                    const ticket = existing.items[0];
                    // If ticket exists but station is default, we might want to update it
                    if (ticket.station === 'default') {
                        console.log(`   Ticket exists for order ${order.id} but station is default. Will recalculate...`);
                        isUpdate = true;
                        existingTicketId = ticket.id;
                        // We will continue to recalculate logic, but then UPDATE instead of CREATE
                    } else {
                        console.log(`   Ticket already exists for order ${order.id} with station ${ticket.station}`);
                        continue;
                    }
                } else {
                    console.log(`   Creating ticket for order ${order.id}...`);
                }

                // Get order items
                const allOrderItems = await pb.collection('orderItem').getFullList({
                    filter: `orderId = "${order.id}"`
                });

                // If filter fails (relation issue), fetch all and filter manually
                let orderItems = allOrderItems;
                if (orderItems.length === 0) {
                    const allItems = await pb.collection('orderItem').getFullList();
                    orderItems = allItems.filter(i => {
                        const oid = Array.isArray(i.orderId) ? i.orderId[0] : i.orderId;
                        return oid === order.id;
                    });
                }

                if (orderItems.length === 0) {
                    console.log(`   ⚠️ No items found for order ${order.id}`);
                    continue;
                }

                const items = orderItems.map(item => ({
                    menuItemId: item.menuItemId,
                    name: item.nameSnapshot,
                    qty: item.qty,
                    options: item.optionsSnapshot || [],
                    unitPrice: item.unitPrice,
                }));

                // Determine station logic
                let station = 'default';
                const categoryStations = {};

                // Fetch menu items and their categories to determine station
                for (const orderItem of items) {
                    try {
                        const menuItem = await pb.collection('menuItem').getOne(orderItem.menuItemId, {
                            expand: 'categoryId',
                        });

                        // Get category name
                        let categoryName = '';
                        if (menuItem.categoryId) {
                            try {
                                const categoryId = Array.isArray(menuItem.categoryId) ? menuItem.categoryId[0] : menuItem.categoryId;
                                const category = await pb.collection('menuCategory').getOne(categoryId);
                                categoryName = category.name.toLowerCase();
                            } catch (e) {
                                // Category not found, skip
                            }
                        }

                        // Map category to station based on category name
                        let itemStation = 'default';
                        if (categoryName.includes('beverage') || categoryName.includes('drink') || categoryName.includes('bar') || categoryName.includes('juice') || categoryName.includes('coffee') || categoryName.includes('tea') || categoryName.includes('cocktail') || categoryName.includes('mocktail') || categoryName.includes('shake') || categoryName.includes('smoothie')) {
                            itemStation = 'bar';
                        } else if (categoryName.includes('salad') || categoryName.includes('cold') || (categoryName.includes('appetizer') && categoryName.includes('cold')) || categoryName.includes('ice cream')) {
                            itemStation = 'cold';
                        } else if (categoryName.includes('main') || categoryName.includes('entree') || categoryName.includes('hot') || categoryName.includes('appetizer') || categoryName.includes('dessert') || categoryName.includes('starter') || categoryName.includes('bread') || categoryName.includes('rice') || categoryName.includes('soup') || categoryName.includes('curry') || categoryName.includes('tandoor') || categoryName.includes('pizza') || categoryName.includes('burger') || categoryName.includes('pasta')) {
                            itemStation = 'hot';
                        }

                        // Count stations by frequency
                        categoryStations[itemStation] = (categoryStations[itemStation] || 0) + orderItem.qty;
                    } catch (e) {
                        // Menu item not found, use default
                        categoryStations['default'] = (categoryStations['default'] || 0) + orderItem.qty;
                    }
                }

                // Determine the most common station (by quantity)
                if (Object.keys(categoryStations).length > 0) {
                    station = Object.entries(categoryStations).reduce((a, b) =>
                        categoryStations[a[0]] > categoryStations[b[0]] ? a : b
                    )[0];
                }

                const tenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;
                const locationId = Array.isArray(order.locationId) ? order.locationId[0] : order.locationId;

                if (existing.totalItems > 0 && existing.items[0].station === 'default') {
                    await pb.collection('kdsTicket').update(existing.items[0].id, {
                        station: station
                    });
                    console.log(`   ✅ Updated ticket ${existing.items[0].id} station to ${station}`);
                } else if (existing.totalItems === 0) {
                    await pb.collection('kdsTicket').create({
                        tenantId,
                        locationId,
                        orderId: order.id,
                        station,
                        status: 'queued',
                        ticketItems: items,
                        priority: false, // Ensure this is boolean
                    });
                    created++;
                    console.log(`   ✅ Created ticket for order ${order.id} at station ${station}`);
                }

            } catch (e) {
                console.error(`   ❌ Error processing order ${order.id}:`, e.message);
                if (e.response && e.response.data) {
                    console.error('   Details:', JSON.stringify(e.response.data, null, 2));
                }
            }
        }

        console.log(`\n✅ Generated ${created} tickets`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

generateTickets();

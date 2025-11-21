/**
 * Create KDS tickets for all orders that should have them
 * This will create tickets for orders with status: accepted, in_kitchen, ready
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function createKDSTicketsForAllOrders() {
  const pb = new PocketBase(PB_URL);

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated as admin');

    // Get all orders
    const orders = await pb.collection('orders').getList(1, 100, {
      sort: '-created',
    });

    console.log(`\nFound ${orders.items.length} total orders`);

    // Get all existing KDS tickets
    const existingTickets = await pb.collection('kdsTicket').getList(1, 100);
    const ordersWithTickets = new Set(existingTickets.items.map(t => t.orderId));

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const order of orders.items) {
      // Only create tickets for orders that are accepted, in_kitchen, or ready
      if (!['accepted', 'in_kitchen', 'ready'].includes(order.status)) {
        console.log(`⏭️  Order ${order.id.slice(0, 8)} has status "${order.status}", skipping`);
        skipped++;
        continue;
      }

      if (ordersWithTickets.has(order.id)) {
        console.log(`⏭️  Order ${order.id.slice(0, 8)} already has a KDS ticket`);
        skipped++;
        continue;
      }

      try {
        // Fetch order items
        const orderItems = await pb.collection('orderItem').getList(1, 100, {
          filter: `orderId = "${order.id}"`,
        });

        const items = orderItems.items.map(item => ({
          menuItemId: item.menuItemId,
          name: item.nameSnapshot,
          qty: item.qty,
          options: item.optionsSnapshot || [],
        }));

        // If no items, create a placeholder item
        if (items.length === 0) {
          console.log(`⚠️  Order ${order.id.slice(0, 8)} has no items, creating placeholder ticket`);
          items.push({
            menuItemId: '',
            name: 'No items in order',
            qty: 0,
            options: [],
          });
        }

        // Handle tenantId and locationId (they might be arrays)
        const tenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;
        const locationId = Array.isArray(order.locationId) ? order.locationId[0] : order.locationId;

        if (!tenantId || !locationId) {
          console.log(`⚠️  Order ${order.id.slice(0, 8)} missing tenantId or locationId, skipping`);
          skipped++;
          continue;
        }

        // Determine station based on menu item categories
        let station = 'default';
        const categoryStations = {};
        
        // Fetch menu items and their categories to determine station
        for (const orderItem of orderItems.items) {
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
            if (categoryName.includes('beverage') || categoryName.includes('drink') || categoryName.includes('bar') || categoryName.includes('juice') || categoryName.includes('coffee') || categoryName.includes('tea')) {
              itemStation = 'bar';
            } else if (categoryName.includes('salad') || categoryName.includes('cold') || (categoryName.includes('appetizer') && categoryName.includes('cold'))) {
              itemStation = 'cold';
            } else if (categoryName.includes('main') || categoryName.includes('entree') || categoryName.includes('hot') || categoryName.includes('appetizer') || categoryName.includes('dessert')) {
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

        // Determine ticket status based on order status
        let ticketStatus = 'queued';
        if (order.status === 'ready') {
          ticketStatus = 'ready';
        } else if (order.status === 'in_kitchen') {
          ticketStatus = 'cooking';
        }

        // Create KDS ticket - ensure all required fields are present
        const kdsTicket = await pb.collection('kdsTicket').create({
          tenantId: tenantId,
          locationId: locationId,
          orderId: order.id,
          station: station,
          status: ticketStatus,
          ticketItems: items,
          priority: false,
        });

        console.log(`✅ Created KDS ticket ${kdsTicket.id.slice(0, 8)} for order ${order.id.slice(0, 8)} (status: ${order.status}, ticket status: ${ticketStatus}, items: ${items.length})`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating KDS ticket for order ${order.id.slice(0, 8)}:`, error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        errors++;
      }
    }

    console.log(`\n🎉 Summary:`);
    console.log(`  Created: ${created} KDS tickets`);
    console.log(`  Skipped: ${skipped} orders`);
    console.log(`  Errors: ${errors} orders`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createKDSTicketsForAllOrders();


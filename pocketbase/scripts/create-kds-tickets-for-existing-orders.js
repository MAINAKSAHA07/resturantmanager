/**
 * Create KDS tickets for existing orders that are in_kitchen or accepted but don't have tickets
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function createKDSTicketsForExistingOrders() {
  const pb = new PocketBase(PB_URL);

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated as admin');

    // Get all orders that are accepted or in_kitchen
    const orders = await pb.collection('orders').getList(1, 100, {
      filter: 'status = "accepted" || status = "in_kitchen"',
      sort: '-created',
    });

    console.log(`\nFound ${orders.items.length} orders with status accepted or in_kitchen`);

    // Get all existing KDS tickets
    const existingTickets = await pb.collection('kdsTicket').getList(1, 100);
    const ordersWithTickets = new Set(existingTickets.items.map(t => t.orderId));

    let created = 0;
    let skipped = 0;

    for (const order of orders.items) {
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

        if (orderItems.items.length === 0) {
          console.log(`⚠️  Order ${order.id.slice(0, 8)} has no items, skipping`);
          skipped++;
          continue;
        }

        const items = orderItems.items.map(item => ({
          menuItemId: item.menuItemId,
          name: item.nameSnapshot,
          qty: item.qty,
          options: item.optionsSnapshot || [],
        }));

        // Handle tenantId and locationId (they might be arrays)
        const tenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;
        const locationId = Array.isArray(order.locationId) ? order.locationId[0] : order.locationId;

        // Create KDS ticket
        const kdsTicket = await pb.collection('kdsTicket').create({
          tenantId: tenantId,
          locationId: locationId,
          orderId: order.id,
          station: 'default',
          status: 'queued',
          ticketItems: items,
          priority: false,
        });

        console.log(`✅ Created KDS ticket ${kdsTicket.id} for order ${order.id.slice(0, 8)} (status: ${order.status})`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating KDS ticket for order ${order.id.slice(0, 8)}:`, error.message);
        if (error.response?.data) {
          console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    console.log(`\n🎉 Summary: Created ${created} KDS tickets, skipped ${skipped} orders`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createKDSTicketsForExistingOrders();


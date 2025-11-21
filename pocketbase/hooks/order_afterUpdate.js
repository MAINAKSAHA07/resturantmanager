/**
 * PocketBase Hook: order afterUpdate
 * Creates KDS ticket when order is accepted
 */

module.exports = async (e) => {
  const record = e.record;
  const oldRecord = e.detail.old || {};
  const oldStatus = oldRecord.status || 'placed';
  const newStatus = record.status;

  // Create KDS ticket when order is accepted
  if (oldStatus !== 'accepted' && newStatus === 'accepted') {
    const $app = e.app;
    
    try {
      // Fetch order items to build KDS ticket
      const orderItems = await $app.dao().findRecordsByFilter(
        'orderItem',
        `orderId = "${record.id}"`
      );

      const items = orderItems.map(item => ({
        menuItemId: item.menuItemId,
        name: item.nameSnapshot,
        qty: item.qty,
        options: item.optionsSnapshot || [],
      }));

      // Determine station (simplified - can be enhanced)
      const station = 'default'; // TODO: determine based on menu items

      // Create KDS ticket
      const kdsTicket = $app.dao().createRecord('kdsTicket', {
        tenantId: record.tenantId,
        locationId: record.locationId,
        orderId: record.id,
        station: station,
        status: 'queued',
        ticketItems: items,
        priority: false,
      });

      await $app.dao().saveRecord(kdsTicket);
    } catch (error) {
      console.error('Error creating KDS ticket:', error);
      // Don't fail the order update if KDS ticket creation fails
    }
  }

  // Realtime events are automatically emitted by PocketBase
  return record;
};




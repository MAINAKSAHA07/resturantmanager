/**
 * PocketBase Hook: order beforeUpdate
 * Validates order status transitions and updates timestamps
 */

const { canTransition, getTimestampField } = require('../../packages/lib/dist/orders');

module.exports = (e) => {
  const record = e.record;
  const oldRecord = e.detail.old || {};
  const oldStatus = oldRecord.status || 'placed';
  const newStatus = record.status;

  // Validate transition
  if (oldStatus !== newStatus) {
    const allowed = canTransition(oldStatus, newStatus);
    if (!allowed) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }

    // Update timestamps
    const timestamps = record.timestamps || {};
    const timestampField = getTimestampField(newStatus);
    if (timestampField) {
      timestamps[timestampField] = new Date().toISOString();
      record.timestamps = timestamps;
    }
  }

  // Auto-create KDS ticket when order is accepted
  if (oldStatus !== 'accepted' && newStatus === 'accepted') {
    // This will be handled by afterUpdate hook or external trigger
    // For now, we'll set a flag
    record._createKdsTicket = true;
  }

  return record;
};




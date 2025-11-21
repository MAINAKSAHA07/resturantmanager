/**
 * Order status transitions and validation
 */

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'in_kitchen'
  | 'ready'
  | 'served'
  | 'completed'
  | 'canceled'
  | 'refunded';

export type KDSStatus = 'queued' | 'cooking' | 'ready' | 'bumped';

export const ORDER_STATUSES: OrderStatus[] = [
  'placed',
  'accepted',
  'in_kitchen',
  'ready',
  'served',
  'completed',
  'canceled',
  'refunded',
];

export const KDS_STATUSES: KDSStatus[] = ['queued', 'cooking', 'ready', 'bumped'];

/**
 * Valid next states for order transitions
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['accepted', 'canceled'],
  accepted: ['in_kitchen', 'canceled'],
  in_kitchen: ['ready', 'canceled'],
  ready: ['served', 'canceled'],
  served: ['completed'],
  completed: [], // terminal
  canceled: [], // terminal
  refunded: [], // terminal
};

export function canTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getTimestampField(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    placed: 'placedAt',
    accepted: 'acceptedAt',
    in_kitchen: 'inKitchenAt',
    ready: 'readyAt',
    served: 'servedAt',
    completed: 'completedAt',
    canceled: 'canceledAt',
    refunded: 'refundedAt',
  };
  return map[status] || '';
}




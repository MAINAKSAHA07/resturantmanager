import { z } from 'zod';

export const MenuItemSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  locationId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  basePrice: z.number(),
  hsnSac: z.string().optional(),
  taxRate: z.number(),
  isActive: z.boolean(),
});

export const OptionGroupSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  name: z.string(),
  minSelect: z.number(),
  maxSelect: z.number(),
  required: z.boolean(),
});

export const OptionValueSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  priceDelta: z.number(),
});

export const CartItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().min(1),
  options: z.array(z.object({
    groupId: z.string(),
    valueIds: z.array(z.string()),
  })).optional(),
});

export const CreateOrderSchema = z.object({
  locationId: z.string(),
  channel: z.enum(['dine_in', 'pickup']),
  customerId: z.string().optional(),
  tableId: z.string().optional(),
  items: z.array(CartItemSchema),
  customerStateCode: z.string().optional(),
});

export const CreateReservationSchema = z.object({
  locationId: z.string(),
  customerId: z.string().optional(),
  partySize: z.number().min(1),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
});




/**
 * PocketBase Migration: Create all collections with schema and rules
 * Run with: node migrations/run.js
 */

const collections = [
  {
    name: 'tenant',
    type: 'base',
    schema: [
      {
        name: 'key',
        type: 'text',
        required: true,
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'primaryDomain',
        type: 'text',
        required: true,
      },
      {
        name: 'adminDomain',
        type: 'text',
        required: true,
      },
      {
        name: 'theme',
        type: 'json',
        required: false,
        options: {
          maxSize: 2000000,
        },
      },
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_tenant_key` ON `tenant` (`key`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: null,
    updateRule: null,
    deleteRule: null,
  },
  {
    name: 'customer',
    type: 'auth',
    schema: [
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'phone',
        type: 'text',
        required: false,
      },
    ],
    indexes: [],
    listRule: '@request.auth.id = id',
    viewRule: '@request.auth.id = id',
    createRule: '',
    updateRule: '@request.auth.id = id',
    deleteRule: '@request.auth.id = id',
  },
  {
    name: 'location',
    type: 'base',
    schema: [
      {
        name: 'tenantId',
        type: 'relation',
        required: true,
        collectionId: 'tenant',
        cascadeDelete: false,
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'stateCode',
        type: 'text',
        required: true,
      },
      {
        name: 'gstin',
        type: 'text',
        required: true,
      },
      {
        name: 'address',
        type: 'json',
        required: false,
        options: {
          maxSize: 2000000,
        },
      },
      {
        name: 'hours',
        type: 'json',
        required: false,
        options: {
          maxSize: 2000000,
        },
      },
    ],
    indexes: [
      'CREATE INDEX `idx_location_tenant` ON `location` (`tenantId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'role',
    type: 'base',
    schema: [
      {
        name: 'tenantId',
        type: 'relation',
        required: true,
        collectionId: 'tenant',
        cascadeDelete: false,
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
    ],
    indexes: [
      'CREATE INDEX `idx_role_tenant` ON `role` (`tenantId`, `name`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'menuCategory',
    type: 'base',
    schema: [
      {
        name: 'tenantId',
        type: 'relation',
        required: true,
        collectionId: 'tenant',
        cascadeDelete: false,
      },
      {
        name: 'locationId',
        type: 'relation',
        required: true,
        collectionId: 'location',
        cascadeDelete: false,
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'sort',
        type: 'number',
        required: false,
        defaultValue: 0,
      },
    ],
    indexes: [
      'CREATE INDEX `idx_category_tenant_location` ON `menuCategory` (`tenantId`, `locationId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'menuItem',
    type: 'base',
    schema: [
      {
        name: 'tenantId',
        type: 'relation',
        required: true,
        collectionId: 'tenant',
        cascadeDelete: false,
      },
      {
        name: 'locationId',
        type: 'relation',
        required: true,
        collectionId: 'location',
        cascadeDelete: false,
      },
      {
        name: 'categoryId',
        type: 'relation',
        required: true,
        collectionId: 'menuCategory',
        cascadeDelete: false,
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        type: 'text',
        required: false,
      },
      {
        name: 'image',
        type: 'file',
        required: false,
        options: {
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
      },
      {
        name: 'basePrice',
        type: 'number',
        required: true,
      },
      {
        name: 'hsnSac',
        type: 'text',
        required: false,
      },
      {
        name: 'taxRate',
        type: 'number',
        required: true,
        defaultValue: 5,
      },
      {
        name: 'isActive',
        type: 'bool',
        required: true,
        defaultValue: true,
      },
    ],
    indexes: [
      'CREATE INDEX `idx_item_tenant_location` ON `menuItem` (`tenantId`, `locationId`, `isActive`)',
      'CREATE INDEX `idx_item_category` ON `menuItem` (`categoryId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'optionGroup',
    type: 'base',
    schema: [
      {
        name: 'menuItemId',
        type: 'relation',
        required: true,
        collectionId: 'menuItem',
        cascadeDelete: true,
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'minSelect',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'maxSelect',
        type: 'number',
        required: true,
        defaultValue: 1,
      },
      {
        name: 'required',
        type: 'bool',
        required: true,
        defaultValue: false,
      },
    ],
    indexes: [
      'CREATE INDEX `idx_option_group_item` ON `optionGroup` (`menuItemId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'optionValue',
    type: 'base',
    schema: [
      {
        name: 'groupId',
        type: 'relation',
        required: true,
        collectionId: 'optionGroup',
        cascadeDelete: true,
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'priceDelta',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
    ],
    indexes: [
      'CREATE INDEX `idx_option_value_group` ON `optionValue` (`groupId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'tables',
    type: 'base',
    schema: [
      {
        name: 'tenantId',
        type: 'relation',
        required: true,
        collectionId: 'tenant',
        cascadeDelete: false,
      },
      {
        name: 'locationId',
        type: 'relation',
        required: true,
        collectionId: 'location',
        cascadeDelete: false,
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'capacity',
        type: 'number',
        required: true,
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        defaultValue: 'available',
        options: {
          maxSelect: 1,
          values: ['available', 'seated', 'cleaning', 'held'],
        },
      },
      {
        name: 'x',
        type: 'number',
        required: false,
        defaultValue: 0,
      },
      {
        name: 'y',
        type: 'number',
        required: false,
        defaultValue: 0,
      },
    ],
    indexes: [
      'CREATE INDEX `idx_table_tenant_location` ON `tables` (`tenantId`, `locationId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'reservation',
    type: 'base',
    schema: [
      // ... (keep existing fields)
      {
        name: 'tenantId',
        type: 'relation',
        required: true,
        collectionId: 'tenant',
        cascadeDelete: false,
      },
      {
        name: 'locationId',
        type: 'relation',
        required: true,
        collectionId: 'location',
        cascadeDelete: false,
      },
      {
        name: 'customerId',
        type: 'relation',
        required: false,
        collectionId: 'customer',
        cascadeDelete: false,
      },
      {
        name: 'partySize',
        type: 'number',
        required: true,
      },
      {
        name: 'startTime',
        type: 'date',
        required: true,
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        defaultValue: 'pending',
        options: {
          maxSelect: 1,
          values: ['pending', 'confirmed', 'seated', 'completed', 'no_show', 'canceled'],
        },
      },
      {
        name: 'notes',
        type: 'text',
        required: false,
      },
    ],
    indexes: [
      'CREATE INDEX `idx_reservation_tenant_location` ON `reservation` (`tenantId`, `locationId`, `status`)',
      'CREATE INDEX `idx_reservation_customer` ON `reservation` (`customerId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'orders',
    type: 'base',
    schema: [
      {
        name: 'tenantId',
        type: 'relation',
        required: true,
        collectionId: 'tenant',
        cascadeDelete: false,
      },
      {
        name: 'locationId',
        type: 'relation',
        required: true,
        collectionId: 'location',
        cascadeDelete: false,
      },
      {
        name: 'channel',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['dine_in', 'pickup'],
        },
      },
      {
        name: 'customerId',
        type: 'relation',
        required: false,
        collectionId: 'customer',
        cascadeDelete: false,
      },
      {
        name: 'tableId',
        type: 'relation',
        required: false,
        collectionId: 'tables',
        cascadeDelete: false,
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        defaultValue: 'placed',
        options: {
          maxSelect: 1,
          values: ['placed', 'accepted', 'in_kitchen', 'ready', 'served', 'completed', 'canceled', 'refunded'],
        },
      },
      {
        name: 'subtotal',
        type: 'number',
        required: true,
      },
      {
        name: 'taxCgst',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'taxSgst',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'taxIgst',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'total',
        type: 'number',
        required: true,
      },
      {
        name: 'razorpayOrderId',
        type: 'text',
        required: false,
      },
      {
        name: 'razorpayPaymentId',
        type: 'text',
        required: false,
      },
      {
        name: 'timestamps',
        type: 'json',
        required: false,
        options: {
          maxSize: 2000000,
        },
      },
      {
        name: 'invoicePdf',
        type: 'file',
        required: false,
        options: {
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['application/pdf'],
        },
      },
    ],
    indexes: [
      'CREATE INDEX `idx_order_tenant_location` ON `orders` (`tenantId`, `locationId`, `status`)',
      'CREATE INDEX `idx_order_customer` ON `orders` (`customerId`)',
      'CREATE INDEX `idx_order_razorpay` ON `orders` (`razorpayOrderId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'orderItem',
    type: 'base',
    schema: [
      {
        name: 'orderId',
        type: 'relation',
        required: true,
        collectionId: 'orders',
        cascadeDelete: true,
      },
      // ... (keep other fields)
      {
        name: 'menuItemId',
        type: 'relation',
        required: true,
        collectionId: 'menuItem',
        cascadeDelete: false,
      },
      {
        name: 'nameSnapshot',
        type: 'text',
        required: true,
      },
      {
        name: 'qty',
        type: 'number',
        required: true,
      },
      {
        name: 'unitPrice',
        type: 'number',
        required: true,
      },
      {
        name: 'optionsSnapshot',
        type: 'json',
        required: false,
        options: {
          maxSize: 2000000,
        },
      },
    ],
    indexes: [
      'CREATE INDEX `idx_order_item_order` ON `orderItem` (`orderId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
  {
    name: 'kdsTicket',
    type: 'base',
    schema: [
      {
        name: 'tenantId',
        type: 'relation',
        required: true,
        collectionId: 'tenant',
        cascadeDelete: false,
      },
      {
        name: 'locationId',
        type: 'relation',
        required: true,
        collectionId: 'location',
        cascadeDelete: false,
      },
      {
        name: 'orderId',
        type: 'relation',
        required: true,
        collectionId: 'orders',
        cascadeDelete: false,
      },
      {
        name: 'station',
        type: 'select',
        required: true,
        defaultValue: 'default',
        options: {
          maxSelect: 1,
          values: ['hot', 'cold', 'bar', 'default'],
        },
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        defaultValue: 'queued',
        options: {
          maxSelect: 1,
          values: ['queued', 'cooking', 'ready', 'bumped'],
        },
      },
      {
        name: 'ticketItems',
        type: 'json',
        required: true,
        options: {
          maxSize: 2000000,
        },
      },
      {
        name: 'priority',
        type: 'bool',
        required: true,
        defaultValue: false,
      },
    ],
    indexes: [
      'CREATE INDEX `idx_kds_tenant_location_status` ON `kdsTicket` (`tenantId`, `locationId`, `status`)',
      'CREATE INDEX `idx_kds_order` ON `kdsTicket` (`orderId`)'
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  },
];

module.exports = { collections };


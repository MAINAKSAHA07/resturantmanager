'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: string;
  x: number;
  y: number;
  locationId: string;
  activeOrders?: number;
  orderTotal?: number;
}

interface Location {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  basePrice: number; // In paise
  availability: string;
}

export default function FloorPlanPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag state
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [initialTablePos, setInitialTablePos] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  
  // Use refs to avoid stale closures in event handlers
  const isDraggingRef = React.useRef(false);
  const activeTableIdRef = React.useRef<string | null>(null);
  const tablesRef = React.useRef<Table[]>([]);
  
  // Keep refs in sync with state
  React.useEffect(() => {
    isDraggingRef.current = isDragging;
    activeTableIdRef.current = activeTableId;
    tablesRef.current = tables;
  }, [isDragging, activeTableId, tables]);

  const [showAddTable, setShowAddTable] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [orderItems, setOrderItems] = useState<{ menuItemId: string; quantity: number; comment?: string; options?: any[] }[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [allTableOrders, setAllTableOrders] = useState<any[]>([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<number>(1);

  useEffect(() => {
    fetchData();
  }, []);

  // Global mouse event listeners for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentActiveTableId = activeTableIdRef.current;
      if (!currentActiveTableId || !dragOffset) return;

      e.preventDefault();
      e.stopPropagation();

      // Calculate new position
      const floorPlan = document.querySelector('.floor-plan-container');
      if (floorPlan) {
        const rect = floorPlan.getBoundingClientRect();

        // Calculate position relative to container
        // We subtract the offset to keep the mouse relative to the element consistent
        let newX = e.clientX - rect.left - dragOffset.x;
        let newY = e.clientY - rect.top - dragOffset.y;

        // Boundary checks (optional, but good for UX)
        // Assuming table size is approx 80x80 (w-20 h-20)
        const maxX = rect.width - 80;
        const maxY = rect.height - 80;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        // Update local state immediately for smooth dragging
        setTables(prevTables =>
          prevTables.map(t =>
            t.id === currentActiveTableId ? { ...t, x: newX, y: newY } : t
          )
        );

        // Check if we've moved enough to consider it a drag (increased threshold for better detection)
        if (dragStartPos) {
          const moved = Math.abs(e.clientX - dragStartPos.x) > 10 || Math.abs(e.clientY - dragStartPos.y) > 10;
          if (moved && !isDraggingRef.current) {
            setIsDragging(true);
            isDraggingRef.current = true;
          }
        }
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const currentActiveTableId = activeTableIdRef.current;
      const wasDragging = isDraggingRef.current;
      
      if (!currentActiveTableId) return;

      e.preventDefault();
      e.stopPropagation();

      // Small delay to prevent click event from firing
      await new Promise(resolve => setTimeout(resolve, 10));

      // If it was a drag, save the new position
      if (wasDragging) {
        const currentTables = tablesRef.current;
        const table = currentTables.find(t => t.id === currentActiveTableId);
        if (table) {
          await updateTablePosition(currentActiveTableId, table.x, table.y);
        }
      } else {
        // If it wasn't a drag (just a click), handle click
        // Use a timeout to ensure state is updated
        setTimeout(() => {
          const currentTables = tablesRef.current;
          const table = currentTables.find(t => t.id === currentActiveTableId);
          if (table) {
            handleTableClick(table);
          }
        }, 50);
      }

      // Reset state
      setActiveTableId(null);
      setIsDragging(false);
      setDragStartPos(null);
      setInitialTablePos(null);
      setDragOffset(null);
      isDraggingRef.current = false;
      activeTableIdRef.current = null;
    };

    if (activeTableId) {
      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp, { passive: false });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeTableId, dragOffset, dragStartPos]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchTables(),
        fetchLocations(),
        fetchMenuItems(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/tables');
      const data = await response.json();
      if (data.tables) {
        setTables(data.tables);
        if (data.tables.length > 0 && !selectedLocation) {
          // Get locationId from first table (handle array format)
          const firstTable = data.tables[0];
          const firstLocation = Array.isArray(firstTable.locationId)
            ? firstTable.locationId[0]
            : firstTable.locationId;
          if (firstLocation) {
            setSelectedLocation(firstLocation);
          }
        }
      }
      console.log('[Floor Plan] Fetched tables:', data.tables?.length || 0);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      if (data.locations) {
        setLocations(data.locations);
        if (data.locations.length > 0 && !selectedLocation) {
          setSelectedLocation(data.locations[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu/items');
      const data = await response.json();
      if (data.items) {
        // Filter only available items
        const available = data.items.filter((item: any) =>
          item.availability === 'available' || item.isActive === true
        );
        setMenuItems(available);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const handleAddTable = async () => {
    // Trim and validate inputs
    const trimmedName = newTableName.trim();

    if (!trimmedName) {
      alert('Please enter a table name');
      return;
    }

    if (!selectedLocation || selectedLocation === '') {
      alert('Please select a location');
      return;
    }

    if (!newTableCapacity || newTableCapacity < 1) {
      alert('Please enter a valid capacity (at least 1)');
      return;
    }

    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          capacity: newTableCapacity,
          locationId: selectedLocation,
          x: 100,
          y: 100,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Add the new table to local state immediately for instant display
        if (data.table) {
          const newTable: Table = {
            id: data.table.id,
            name: data.table.name,
            capacity: data.table.capacity,
            status: data.table.status || 'available',
            x: data.table.x || 100,
            y: data.table.y || 100,
            locationId: Array.isArray(data.table.locationId) ? data.table.locationId[0] : data.table.locationId,
            activeOrders: 0,
            orderTotal: 0,
          };
          
          // Add to local state immediately
          setTables(prevTables => [...prevTables, newTable]);
          
          // Ensure location is selected
          const tableLocationId = Array.isArray(data.table.locationId)
            ? data.table.locationId[0]
            : data.table.locationId;
          if (tableLocationId && tableLocationId !== selectedLocation) {
            setSelectedLocation(tableLocationId);
          }
        }
        
        setShowAddTable(false);
        setNewTableName('');
        setNewTableCapacity(4);

        // Refresh tables and locations in background to sync with server
        Promise.all([fetchTables(), fetchLocations()]).catch(err => {
          console.error('Error refreshing after table creation:', err);
        });
      } else {
        alert(data.error || 'Failed to create table');
      }
    } catch (error: any) {
      console.error('Error creating table:', error);
      alert('Failed to create table: ' + error.message);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tables?id=${tableId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await fetchTables();
      } else {
        alert(data.error || 'Failed to delete table');
      }
    } catch (error: any) {
      console.error('Error deleting table:', error);
      alert('Failed to delete table: ' + error.message);
    }
  };

  const handleUpdateTableStatus = async (tableId: string, status: string) => {
    // Update local state immediately for real-time UI update
    setTables(prevTables =>
      prevTables.map(t =>
        t.id === tableId ? { ...t, status } : t
      )
    );
    
    // Also update selectedTable if it's the one being updated
    if (selectedTable && selectedTable.id === tableId) {
      setSelectedTable({ ...selectedTable, status });
    }
    
    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, status }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh in background to sync with server (activeOrders, orderTotal, etc.)
        fetchTables().catch(err => {
          console.error('Error refreshing after status update:', err);
        });
      } else {
        // Revert on error
        setTables(prevTables =>
          prevTables.map(t =>
            t.id === tableId ? { ...t, status: selectedTable?.status || 'available' } : t
          )
        );
        alert(data.error || 'Failed to update table status');
      }
    } catch (error: any) {
      console.error('Error updating table status:', error);
      // Revert on error
      setTables(prevTables =>
        prevTables.map(t =>
          t.id === tableId ? { ...t, status: selectedTable?.status || 'available' } : t
        )
      );
      alert('Failed to update table status: ' + error.message);
    }
  };

  // Add Razorpay type definition
  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'menu' | 'ongoing'>('menu');

  const handleMouseDown = (e: React.MouseEvent, table: Table) => {
    e.preventDefault(); // Prevent text selection
    e.stopPropagation();

    const floorPlan = e.currentTarget.closest('.floor-plan-container');
    if (!floorPlan) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Reset drag state
    setIsDragging(false);
    isDraggingRef.current = false;
    
    setActiveTableId(table.id);
    activeTableIdRef.current = table.id;
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialTablePos({ x: table.x, y: table.y });
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const updateTablePosition = async (tableId: string, x: number, y: number) => {
    try {
      await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, x, y }),
      });
      // No need to fetchTables here as we updated local state optimistically
      // But good to sync eventually or on error
    } catch (error) {
      console.error('Error updating table position:', error);
      // Revert on error
      await fetchTables();
    }
  };

  const handleTableClick = async (table: Table) => {
    setSelectedTable(table);
    setOrderItems([]);
    setMenuSearchQuery('');

    // Check if table has an active order
    if (table.activeOrders && table.activeOrders > 0) {
      const orders = await fetchTableOrders(table.id);
      if (orders && orders.length > 0) {
        console.log(`[FloorPlan] Found ${orders.length} active order(s) for table:`, orders);
        setActiveTab('ongoing');
        setShowOrderModal(true);
      } else {
        // Fallback
        console.warn(`Table ${table.id} has activeOrders=${table.activeOrders} but no active order found. Opening create modal.`);
        setActiveTab('menu');
        setShowOrderModal(true);
      }
    } else {
      setActiveTab('menu');
      setShowOrderModal(true);
    }
  };

  const fetchTableOrders = async (tableId: string) => {
    try {
      console.log(`[fetchTableOrders] Fetching all orders for table ${tableId}`);
      const response = await fetch('/api/orders');
      const data = await response.json();
      
      if (!response.ok) {
        console.error('[fetchTableOrders] API error:', data);
        return [];
      }
      
      if (data.orders) {
        console.log(`[fetchTableOrders] Found ${data.orders.length} total orders`);
        
        // Find ALL active orders for this table
        // Active orders are: placed, accepted, in_kitchen, ready, served (not completed or canceled)
        const tableOrders = data.orders.filter((order: any) => {
          const orderTableId = Array.isArray(order.tableId) ? order.tableId[0] : order.tableId;
          const matchesTable = orderTableId === tableId;
          const isActive = order.status !== 'completed' && 
                          order.status !== 'canceled' && 
                          order.status !== 'refunded';
          
          if (matchesTable) {
            console.log(`[fetchTableOrders] Order ${order.id.slice(0, 8)}: tableId=${orderTableId}, status=${order.status}, isActive=${isActive}`);
          }
          
          return matchesTable && isActive;
        });

        console.log(`[fetchTableOrders] Found ${tableOrders.length} active orders for table ${tableId}`);

        if (tableOrders.length > 0) {
          // Sort by most recent first
          const sortedOrders = tableOrders.sort((a: any, b: any) =>
            new Date(b.created).getTime() - new Date(a.created).getTime()
          );

          // Fetch items for all orders
          const ordersWithItems = await Promise.all(
            sortedOrders.map(async (order: any) => {
              try {
                const orderItemsResponse = await fetch(`/api/orders/${order.id}/items`);
                const orderItemsData = await orderItemsResponse.json();
                if (orderItemsData.items) {
                  order.items = orderItemsData.items;
                  console.log(`[fetchTableOrders] Loaded ${order.items.length} items for order ${order.id.slice(0, 8)}`);
                } else {
                  console.warn(`[fetchTableOrders] No items found for order ${order.id.slice(0, 8)}`);
                  order.items = [];
                }
              } catch (e) {
                console.error(`[fetchTableOrders] Error fetching items for order ${order.id.slice(0, 8)}:`, e);
                order.items = [];
              }
              return order;
            })
          );

          // Set all orders and use the most recent one as current
          setAllTableOrders(ordersWithItems);
          setCurrentOrder(ordersWithItems[0]);
          console.log(`[fetchTableOrders] Set ${ordersWithItems.length} orders, current order: ${ordersWithItems[0].id.slice(0, 8)}`);
          
          return ordersWithItems;
        } else {
          console.warn(`[fetchTableOrders] No active orders found for table ${tableId}`);
          setAllTableOrders([]);
          setCurrentOrder(null);
        }
      }
      return [];
    } catch (error) {
      console.error('[fetchTableOrders] Error fetching table orders:', error);
      setAllTableOrders([]);
      setCurrentOrder(null);
      return [];
    }
  };

  // Keep the old function name for backward compatibility
  const fetchTableOrder = async (tableId: string) => {
    const orders = await fetchTableOrders(tableId);
    return orders.length > 0 ? orders[0] : null;
  };

  const handleCreateOrder = async () => {
    if (!selectedTable || orderItems.length === 0) {
      alert('Please add items to the order');
      return;
    }

    setCreatingOrder(true);
    try {
      // Ensure all items have comment field (normalize data)
      const normalizedItems = orderItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        comment: item.comment || '',
        ...(item.options && { options: item.options }),
      }));
      
      // Log orderItems before sending to verify comments are included
      console.log('[FloorPlan] Creating order with items:', normalizedItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        comment: item.comment || '(no comment)',
      })));
      
      const response = await fetch(`/api/tables/${selectedTable.id}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: normalizedItems }),
      });

      const data = await response.json();
      if (data.success) {
        // Update table status to 'seated' immediately for real-time UI
        if (selectedTable) {
          setTables(prevTables =>
            prevTables.map(t =>
              t.id === selectedTable.id ? { ...t, status: 'seated' } : t
            )
          );
          setSelectedTable({ ...selectedTable, status: 'seated' });
        }
        
        // Fetch the created order details
        if (data.order) {
          // Fetch order items
          try {
            const orderItemsResponse = await fetch(`/api/orders/${data.order.id}/items`);
            const orderItemsData = await orderItemsResponse.json();
            if (orderItemsData.items) {
              data.order.items = orderItemsData.items;
            }
          } catch (e) {
            console.error('Error fetching order items:', e);
          }
          setCurrentOrder(data.order);
    }

        // Switch to ongoing tab instead of closing
        console.log('[FloorPlan] Order created, switching to ongoing tab. Order:', data.order);
        setActiveTab('ongoing');
        setOrderItems([]);
        
        // Refresh tables in background to sync activeOrders and orderTotal
        fetchTables().catch(err => {
          console.error('Error refreshing after order creation:', err);
        });
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      alert('Failed to create order: ' + error.message);
    } finally {
      setCreatingOrder(false);
    }
  };

  const addItemToOrder = (menuItemId: string) => {
    const existing = orderItems.find(item => item.menuItemId === menuItemId);
    if (existing) {
      setOrderItems(orderItems.map(item =>
        item.menuItemId === menuItemId
          ? { ...item, quantity: item.quantity + 1, comment: item.comment || '' }
          : item
      ));
    } else {
      setOrderItems([...orderItems, { menuItemId, quantity: 1, comment: '' }]);
    }
  };

  const updateItemComment = (menuItemId: string, comment: string) => {
    setOrderItems(orderItems.map(item =>
      item.menuItemId === menuItemId
        ? { ...item, comment }
        : item
    ));
  };

  const removeItemFromOrder = (menuItemId: string) => {
    setOrderItems(orderItems.filter(item => item.menuItemId !== menuItemId));
  };

  const updateItemQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromOrder(menuItemId);
    } else {
      setOrderItems(orderItems.map(item =>
        item.menuItemId === menuItemId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-accent-green';
      case 'seated':
        return 'bg-red-500';
      case 'cleaning':
        return 'bg-orange-500';
      case 'held':
        return 'bg-accent-blue';
      default:
        return 'bg-gray-500';
    }
  };

  const getOrderTotal = () => {
    return orderItems.reduce((total, item) => {
      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
      if (menuItem) {
        // basePrice is in paise, convert to rupees for display
        const priceInRupees = menuItem.basePrice / 100;
        return total + (priceInRupees * item.quantity);
      }
      return total;
    }, 0);
  };

  const addItemsToExistingOrder = async () => {
    if (!currentOrder || !selectedTable || orderItems.length === 0) {
      alert('Please add items to the order');
      return;
    }

    setCreatingOrder(true);
    try {
      // Ensure all items have comment field (normalize data)
      const normalizedItems = orderItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        comment: item.comment || '',
        ...(item.options && { options: item.options }),
      }));
      
      // Log orderItems before sending to verify comments are included
      console.log('[FloorPlan] Adding items to existing order:', normalizedItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        comment: item.comment || '(no comment)',
      })));
      
      // Add items to existing order
      const response = await fetch(`/api/orders/${currentOrder.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: normalizedItems }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add items to order');
      }

      if (data.success) {
        // Update currentOrder with the response data if available
        if (data.order) {
          // Fetch order items for the updated order
          try {
            const orderItemsResponse = await fetch(`/api/orders/${data.order.id}/items`);
            const orderItemsData = await orderItemsResponse.json();
            if (orderItemsData.items) {
              data.order.items = orderItemsData.items;
            }
          } catch (e) {
            console.error('Error fetching order items:', e);
          }
          setCurrentOrder(data.order);
        } else {
          // Fallback: refresh the order details
          const refreshedOrder = await fetchTableOrder(selectedTable.id);
          if (refreshedOrder) {
            setCurrentOrder(refreshedOrder);
          }
        }
        
        // Clear the new items list
        setOrderItems([]);
        setMenuSearchQuery('');
        
        // Switch to ongoing tab to show the updated order
        setActiveTab('ongoing');
        
        // Refresh tables to update order counts
        await fetchTables();
        
        console.log('[FloorPlan] Items added to order successfully');
      } else {
        throw new Error(data.error || 'Failed to add items to order');
      }
    } catch (error: any) {
      console.error('Error adding items to order:', error);
      alert('Failed to add items: ' + (error.message || 'Unknown error'));
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleUpdateOrderItemQuantity = async (itemId: string, newQuantity: number) => {
    if (!currentOrder || newQuantity < 1) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${currentOrder.id}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item quantity');
      }

      if (data.success) {
        // Update currentOrder with the response data
        if (data.order) {
          // Fetch order items for the updated order
          try {
            const orderItemsResponse = await fetch(`/api/orders/${data.order.id}/items`);
            const orderItemsData = await orderItemsResponse.json();
            if (orderItemsData.items) {
              data.order.items = orderItemsData.items;
            }
          } catch (e) {
            console.error('Error fetching order items:', e);
          }
          setCurrentOrder(data.order);
        } else {
          // Fallback: refresh the order
          const refreshedOrder = await fetchTableOrder(selectedTable!.id);
          if (refreshedOrder) {
            setCurrentOrder(refreshedOrder);
          }
        }
        
        setEditingItemId(null);
        await fetchTables();
      }
    } catch (error: any) {
      console.error('Error updating order item:', error);
      alert('Failed to update item: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteOrderItem = async (itemId: string) => {
    if (!currentOrder) {
      return;
    }

    if (!confirm('Are you sure you want to remove this item from the order?')) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${currentOrder.id}/items/${itemId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete item');
      }

      if (data.success) {
        // Update currentOrder with the response data
        if (data.order) {
          // Fetch order items for the updated order
          try {
            const orderItemsResponse = await fetch(`/api/orders/${data.order.id}/items`);
            const orderItemsData = await orderItemsResponse.json();
            if (orderItemsData.items) {
              data.order.items = orderItemsData.items;
            }
          } catch (e) {
            console.error('Error fetching order items:', e);
          }
          setCurrentOrder(data.order);
        } else {
          // Fallback: refresh the order
          const refreshedOrder = await fetchTableOrder(selectedTable!.id);
          if (refreshedOrder) {
            setCurrentOrder(refreshedOrder);
          }
        }
        
        await fetchTables();
      }
    } catch (error: any) {
      console.error('Error deleting order item:', error);
      alert('Failed to delete item: ' + (error.message || 'Unknown error'));
    }
  };

  const handleCashPayment = async () => {
    if (!currentOrder && allTableOrders.length === 0) return;

    if (!confirm(`Confirm cash payment of ₹${((allTableOrders.length > 0
      ? allTableOrders.reduce((sum, order) => sum + (order.total || 0), 0)
      : (currentOrder?.total || 0)) / 100).toFixed(2)}?`)) {
      return;
    }

    try {
      // Update all active orders status to completed
      const ordersToComplete = allTableOrders.length > 0 ? allTableOrders : (currentOrder ? [currentOrder] : []);
      
      await Promise.all(
        ordersToComplete.map(order => 
          fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, status: 'completed' }),
          })
        )
      );
      
      console.log(`✅ Marked ${ordersToComplete.length} orders as completed (cash payment)`);
      
      alert(`Cash payment received! ${ordersToComplete.length > 1 ? `All ${ordersToComplete.length} orders have been completed.` : 'Order completed.'}`);
      
      // Update table status to available
      if (selectedTable) {
        await handleUpdateTableStatus(selectedTable.id, 'available');
      }
      
      setShowOrderModal(false);
      setCurrentOrder(null);
      setAllTableOrders([]);
      setSelectedTable(null);
      await fetchTables();
    } catch (error: any) {
      console.error('Cash payment error:', error);
      alert('Failed to process cash payment: ' + error.message);
    }
  };

  const handlePayment = async () => {
    if (!currentOrder && allTableOrders.length === 0) return;

    try {
      // Calculate combined total from all active orders
      const combinedTotal = allTableOrders.length > 0
        ? allTableOrders.reduce((sum, order) => sum + (order.total || 0), 0)
        : (currentOrder?.total || 0);
      
      const amount = combinedTotal; // Amount in paise
      if (!amount || amount === 0) {
        alert('Invalid order amount');
        return;
      }

      // Create Razorpay order
      const orderResponse = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, orderId: currentOrder?.id || (allTableOrders.length > 0 ? allTableOrders[0].id : '') }),
      });

      const orderData = await orderResponse.json();
      if (orderData.error) {
        throw new Error(orderData.error);
      }

      // Use the most recent order ID for Razorpay description, but process all orders
      const primaryOrderId = currentOrder?.id || (allTableOrders.length > 0 ? allTableOrders[0].id : '');
      
      const options = {
        key: orderData.key,
        amount: amount,
        currency: 'INR',
        name: 'Restaurant Manager',
        description: allTableOrders.length > 1 
          ? `Payment for ${allTableOrders.length} orders on ${selectedTable?.name || 'Table'}`
          : `Payment for order on ${selectedTable?.name || 'Table'}`,
        order_id: orderData.razorpay_order_id,
        handler: async function (response: any) {
          try {
            // Capture payment
            const captureResponse = await fetch('/api/payments/razorpay/capture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderId: primaryOrderId,
                amount: amount,
              }),
            });

            const captureData = await captureResponse.json();
            if (captureData.success) {
              // Update all active orders status to completed
              try {
                await Promise.all(
                  allTableOrders.map(order => 
                    fetch('/api/orders', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: order.id, status: 'completed' }),
                    })
                  )
                );
                console.log(`✅ Marked ${allTableOrders.length} orders as completed`);
              } catch (e) {
                console.error('Error updating order statuses:', e);
              }
              
              alert(`Payment successful! ${allTableOrders.length > 1 ? `All ${allTableOrders.length} orders have been completed.` : 'Order completed.'}`);
              // Update table status to available
              if (selectedTable) {
                await handleUpdateTableStatus(selectedTable.id, 'available');
              }
              setShowOrderModal(false);
              setCurrentOrder(null);
              setAllTableOrders([]);
              setSelectedTable(null);
              await fetchTables();
            } else {
              throw new Error(captureData.error || 'Payment capture failed');
            }
          } catch (error: any) {
            console.error('Payment capture error:', error);
            alert('Payment failed: ' + error.message);
          }
        },
        prefill: {
          name: 'Guest',
          email: '',
          contact: '',
        },
        theme: {
          color: '#3399cc',
        },
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      alert('Failed to initiate payment: ' + error.message);
    }
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(menuSearchQuery.toLowerCase())
  );

  const filteredTables = selectedLocation
    ? tables.filter(t => {
      const tableLocationId = Array.isArray(t.locationId) ? t.locationId[0] : t.locationId;
      return tableLocationId === selectedLocation;
    })
    : tables;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading floor plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 via-accent-purple/5 to-accent-green/5">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
            Floor Plan
          </h1>
          <div className="flex gap-3">
            {locations.length > 0 && (
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowAddTable(true)}
              className="btn-primary px-4 py-2"
            >
              + Add Table
            </button>
          </div>
        </div>

        <div className="card">
          <div
            className="relative w-full h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 floor-plan-container"
            onClick={(e) => {
              // Prevent clicks on the container itself from doing anything
              // Only allow clicks on tables
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onMouseDown={(e) => {
              // Prevent mouse down on container from interfering
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {filteredTables.map((table) => (
              <div
                key={table.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleMouseDown(e, table);
                }}
                onClick={(e) => {
                  // Prevent click if we just finished dragging
                  if (isDraggingRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                }}
                className={`absolute w-20 h-20 rounded-full flex flex-col items-center justify-center text-white cursor-pointer shadow-lg hover:scale-110 transition-transform ${getStatusColor(
                  table.status
                )} ${activeTableId === table.id ? 'z-50 scale-110 shadow-xl' : ''}`}
                style={{
                  left: `${table.x || 0}px`,
                  top: `${table.y || 0}px`,
                  cursor: isDragging && activeTableId === table.id ? 'grabbing' : 'grab',
                  pointerEvents: 'auto'
                }}
                title={`${table.name} - ${table.capacity} seats - ${table.status}`}
              >
                <p className="font-bold text-sm">{table.name}</p>
                  <p className="text-xs">({table.capacity})</p>
                {table.activeOrders && table.activeOrders > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {table.activeOrders}
                </div>
                )}
                {table.orderTotal && table.orderTotal > 0 && (
                  <p className="text-xs mt-1">₹{(table.orderTotal / 100).toFixed(0)}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-accent-green rounded-full"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Seated</span>
              </div>
              <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span>Cleaning</span>
              </div>
              <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-accent-blue rounded-full"></div>
                <span>Held</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Add New Table</h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-2">Table Name *</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Table 1"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Capacity *</label>
                <input
                  type="number"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 4)}
                  className="w-full px-4 py-2 border rounded-lg"
                  min="1"
                  max="20"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Location *</label>
                {locations.length > 0 ? (
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select a location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500">
                      No locations available. Please create a location first.
                    </div>
                    <Link
                      href="/locations"
                      className="btn-primary w-full text-center block"
                    >
                      Go to Locations Page
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddTable}
                disabled={locations.length === 0 || !selectedLocation || !newTableName.trim()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Table
              </button>
              <button
                onClick={() => {
                  setShowAddTable(false);
                  setNewTableName('');
                  setNewTableCapacity(4);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Order Modal */}
      {showOrderModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
                {selectedTable.name}
              </h2>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setSelectedTable(null);
                  setOrderItems([]);
                  setActiveTab('menu');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Status Controls */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => handleUpdateTableStatus(selectedTable.id, 'available')}
                className={`px-3 py-1 rounded ${selectedTable.status === 'available' ? 'bg-accent-green text-white' : 'bg-gray-200'}`}
              >
                Available
              </button>
              <button
                onClick={() => handleUpdateTableStatus(selectedTable.id, 'seated')}
                className={`px-3 py-1 rounded ${selectedTable.status === 'seated' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
              >
                Seated
              </button>
              <button
                onClick={() => handleUpdateTableStatus(selectedTable.id, 'cleaning')}
                className={`px-3 py-1 rounded ${selectedTable.status === 'cleaning' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
              >
                Cleaning
              </button>
              <button
                onClick={() => handleUpdateTableStatus(selectedTable.id, 'held')}
                className={`px-3 py-1 rounded ${selectedTable.status === 'held' ? 'bg-accent-blue text-white' : 'bg-gray-200'}`}
              >
                Held
              </button>
              <button
                onClick={() => handleDeleteTable(selectedTable.id)}
                className="px-3 py-1 rounded bg-red-500 text-white ml-auto"
              >
                Delete Table
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-4">
              <button
                className={`px-4 py-2 font-medium transition-all duration-200 ${activeTab === 'menu' ? 'border-b-2 border-accent-blue text-accent-blue' : 'text-gray-500 hover:text-accent-purple'}`}
                onClick={() => setActiveTab('menu')}
              >
                Menu & Ordering
              </button>
              <button
                className={`px-4 py-2 font-medium transition-all duration-200 ${activeTab === 'ongoing' ? 'border-b-2 border-accent-blue text-accent-blue' : 'text-gray-500 hover:text-accent-purple'} ${!currentOrder ? 'opacity-60' : ''}`}
                onClick={async () => {
                  setActiveTab('ongoing');
                  // If no current order but table has active orders, try to fetch them
                  if (!currentOrder && selectedTable && selectedTable.activeOrders && selectedTable.activeOrders > 0) {
                    await fetchTableOrders(selectedTable.id);
                  }
                }}
              >
                Ongoing Order {allTableOrders.length > 0 ? `(${allTableOrders.length})` : currentOrder ? `(${currentOrder.items?.length || 0} items)` : ''}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'menu' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Menu Items</h3>
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg mb-2"
                  />
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredMenuItems.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No menu items found</p>
                    ) : (
                      filteredMenuItems.map(item => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-2 border rounded hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">₹{(item.basePrice / 100).toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => addItemToOrder(item.id)}
                            className="btn-primary px-3 py-1 text-sm"
                          >
                            Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">New Items to Add</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto min-h-[200px] border rounded p-2 bg-gray-50">
                    {orderItems.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">No items added yet</p>
                    ) : (
                      orderItems.map(item => {
                        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                        if (!menuItem) return null;
                        return (
                          <div
                            key={item.menuItemId}
                            className="p-2 border rounded bg-white space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{menuItem.name}</p>
                                <p className="text-sm text-gray-600">
                                  ₹{(menuItem.basePrice / 100).toFixed(2)} × {item.quantity} = ₹{((menuItem.basePrice / 100) * item.quantity).toFixed(2)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateItemQuantity(item.menuItemId, item.quantity - 1)}
                                  className="px-2 py-1 bg-gray-200 rounded"
                                >
                                  -
                                </button>
                                <span>{item.quantity}</span>
                                <button
                                  onClick={() => updateItemQuantity(item.menuItemId, item.quantity + 1)}
                                  className="px-2 py-1 bg-gray-200 rounded"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => removeItemFromOrder(item.menuItemId)}
                                  className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Comment/Note:</label>
                              <input
                                type="text"
                                placeholder="Add special instructions..."
                                value={item.comment || ''}
                                onChange={(e) => updateItemComment(item.menuItemId, e.target.value)}
                                className="w-full px-2 py-1 text-sm border rounded"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {orderItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>₹{getOrderTotal()}</span>
                      </div>
                      {currentOrder ? (
                        <button
                          onClick={addItemsToExistingOrder}
                          disabled={creatingOrder}
                          className="btn-primary w-full mt-4"
                        >
                          {creatingOrder ? 'Adding...' : 'Add to Existing Order'}
                        </button>
                      ) : (
                        <button
                          onClick={handleCreateOrder}
                          disabled={creatingOrder}
                          className="btn-primary w-full mt-4"
                        >
                          {creatingOrder ? 'Creating...' : 'Create Order'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Ongoing Order Tab
              (currentOrder || allTableOrders.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Order Summary</h3>
                      <button
                        onClick={() => setActiveTab('menu')}
                        className="text-sm text-accent-blue hover:text-accent-purple hover:underline transition-colors"
                      >
                        Add More Items
                      </button>
                    </div>
                    
                    {/* Order Selector - Show if multiple orders */}
                    {allTableOrders.length > 1 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Order ({allTableOrders.length} active):
                        </label>
                        <select
                          value={currentOrder?.id || ''}
                          onChange={(e) => {
                            const selected = allTableOrders.find(o => o.id === e.target.value);
                            if (selected) setCurrentOrder(selected);
                          }}
                          className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                        >
                          {allTableOrders.map((order: any, index: number) => (
                            <option key={order.id} value={order.id}>
                              Order {index + 1} - {order.status} - ₹{((order.total || 0) / 100).toFixed(2)} ({order.items?.length || 0} items)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Current Order Status Badge */}
                    {currentOrder && (
                      <div className="mb-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          currentOrder.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                          currentOrder.status === 'in_kitchen' ? 'bg-orange-100 text-orange-800' :
                          currentOrder.status === 'ready' ? 'bg-yellow-100 text-yellow-800' :
                          currentOrder.status === 'served' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          Status: {currentOrder.status}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto border rounded p-4">
                      {currentOrder.items && currentOrder.items.length > 0 ? (
                        currentOrder.items.map((item: any, index: number) => (
                          <div key={item.id || index} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-gray-50 rounded">
                            <div className="flex-1">
                              <p className="font-medium">{item.nameSnapshot || 'Item'}</p>
                              {editingItemId === item.id ? (
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={() => {
                                      const newQty = Math.max(1, editingQuantity - 1);
                                      setEditingQuantity(newQty);
                                    }}
                                    className="px-2 py-1 bg-gray-200 rounded text-sm"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={editingQuantity}
                                    onChange={(e) => setEditingQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 px-2 py-1 border rounded text-center text-sm"
                                  />
                                  <button
                                    onClick={() => setEditingQuantity(editingQuantity + 1)}
                                    className="px-2 py-1 bg-gray-200 rounded text-sm"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleUpdateOrderItemQuantity(item.id, editingQuantity);
                                    }}
                                    className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingItemId(null);
                                      setEditingQuantity(1);
                                    }}
                                    className="px-3 py-1 bg-gray-300 rounded text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 mt-2">
                                  <p className="text-sm text-gray-600">
                                    ₹{((item.unitPrice || 0) / 100).toFixed(2)} × {item.qty || 1}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setEditingQuantity(item.qty || 1);
                                    }}
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrderItem(item.id)}
                                    className="text-xs text-red-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                            {editingItemId !== item.id && (
                              <p className="font-medium ml-4">
                                ₹{(((item.unitPrice || 0) * (item.qty || 1)) / 100).toFixed(2)}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-8">No items in order</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg h-fit">
                    <h3 className="font-semibold mb-4 text-lg">Bill Details</h3>
                    {allTableOrders.length > 1 && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">
                          Combined bill for {allTableOrders.length} active orders
                        </p>
                      </div>
                    )}
                    <div className="space-y-3 text-sm mb-6">
                      {(() => {
                        // Calculate combined totals from all active orders
                        const combinedSubtotal = allTableOrders.reduce((sum, order) => sum + (order.subtotal || 0), 0);
                        const combinedTaxCgst = allTableOrders.reduce((sum, order) => sum + (order.taxCgst || 0), 0);
                        const combinedTaxSgst = allTableOrders.reduce((sum, order) => sum + (order.taxSgst || 0), 0);
                        const combinedTaxIgst = allTableOrders.reduce((sum, order) => sum + (order.taxIgst || 0), 0);
                        const combinedTotal = allTableOrders.reduce((sum, order) => sum + (order.total || 0), 0);
                        
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Subtotal</span>
                              <span>₹{(combinedSubtotal / 100).toFixed(2)}</span>
                            </div>
                            {combinedTaxCgst > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">CGST</span>
                                <span>₹{(combinedTaxCgst / 100).toFixed(2)}</span>
                              </div>
                            )}
                            {combinedTaxSgst > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">SGST</span>
                                <span>₹{(combinedTaxSgst / 100).toFixed(2)}</span>
                              </div>
                            )}
                            {combinedTaxIgst > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">IGST</span>
                                <span>₹{(combinedTaxIgst / 100).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-xl pt-4 border-t border-gray-300 mt-2">
                              <span>Total</span>
                              <span>₹{(combinedTotal / 100).toFixed(2)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => window.print()}
                        className="w-full py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                      >
                        Generate Bill / Print
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleCashPayment}
                          className="py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
                        >
                          Pay Cash
                        </button>
                        <button
                          onClick={handlePayment}
                          className="py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md"
                        >
                          Pay Online
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg mb-4">No active order found for this table</p>
                  <p className="text-gray-400 text-sm mb-6">
                    {selectedTable?.activeOrders && selectedTable.activeOrders > 0
                      ? 'The order may have been completed or canceled.'
                      : 'Create a new order from the "Menu & Ordering" tab.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="btn-primary"
                  >
                    Go to Menu & Ordering
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}


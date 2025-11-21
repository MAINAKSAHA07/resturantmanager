import { NextRequest, NextResponse } from 'next/server';
import { extractBrandKey } from '@restaurant/lib';
import { calculateGSTForItems } from '@restaurant/lib';
import PocketBase from 'pocketbase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    // Get tenant from cookie or hostname
    const cookies = request.cookies;
    const tenantCookie = cookies.get('selected_tenant')?.value;
    const hostname = request.headers.get('host') || '';
    const extractedBrandKey = extractBrandKey(hostname);
    const brandKey = tenantCookie || extractedBrandKey || 'saffron';

    // Direct PocketBase connection
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get tenant
    const tenants = await pb.collection('tenant').getList(1, 1, {
      filter: `key = "${brandKey}"`,
    });

    if (tenants.items.length === 0) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const tenant = tenants.items[0];

    // Get all locations and filter client-side to handle relation fields
    const allLocations = await pb.collection('location').getList(1, 100, {
      expand: 'tenantId',
    });
    
    // Filter by tenant (handle relation fields which may be arrays)
    const locations = allLocations.items.filter(loc => {
      const locTenantId = Array.isArray(loc.tenantId) ? loc.tenantId[0] : loc.tenantId;
      return locTenantId === tenant.id;
    });

    if (locations.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Use the first location (or could allow selection)
    const location = locations[0];

    // Calculate totals
    const itemData = await Promise.all(
      items.map(async (item: any) => {
        const menuItem = await pb.collection('menuItem').getOne(item.menuItemId);
        let itemPrice = menuItem.basePrice || 0;

        // Add option prices (simplified)
        if (item.options) {
          for (const option of item.options) {
            for (const valueId of option.valueIds) {
              try {
                const optionValue = await pb.collection('optionValue').getOne(valueId);
                itemPrice += optionValue.priceDelta || 0;
              } catch (error) {
                // Option value not found, skip
              }
            }
          }
        }

        return {
          subtotal: (itemPrice || 0) * (item.quantity || 1),
          taxRate: menuItem.taxRate || 0,
        };
      })
    );

    const subtotal = itemData.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const locationStateCode = location.stateCode || '27'; // Default to Maharashtra if not set
    const gst = calculateGSTForItems(itemData, locationStateCode);
    
    console.log('GST calculation result:', JSON.stringify({
      gst: gst,
      gstType: typeof gst,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      totalTax: gst.totalTax,
      locationStateCode,
    }, null, 2));
    
    // Ensure all values are valid numbers (not NaN, null, or undefined)
    // Use explicit checks to ensure we never send invalid values
    let taxCgst = 0;
    let taxSgst = 0;
    let taxIgst = 0;
    
    if (gst && typeof gst === 'object') {
      taxCgst = (gst.cgst !== undefined && gst.cgst !== null && !isNaN(Number(gst.cgst))) 
        ? Math.round(Number(gst.cgst)) 
        : 0;
      taxSgst = (gst.sgst !== undefined && gst.sgst !== null && !isNaN(Number(gst.sgst))) 
        ? Math.round(Number(gst.sgst)) 
        : 0;
      taxIgst = (gst.igst !== undefined && gst.igst !== null && !isNaN(Number(gst.igst))) 
        ? Math.round(Number(gst.igst)) 
        : 0;
    }
    
    const totalTax = taxCgst + taxSgst + taxIgst;
    const total = Math.round(subtotal + totalTax);
    
    console.log('Calculated tax values:', {
      taxCgst,
      taxSgst,
      taxIgst,
      totalTax,
      subtotal,
      total,
      types: {
        taxCgst: typeof taxCgst,
        taxSgst: typeof taxSgst,
        taxIgst: typeof taxIgst,
      },
    });

    // Get customer ID from session token if available
    let customerId = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const session = JSON.parse(Buffer.from(token, 'base64').toString());
        if (session.customerId && session.exp > Date.now()) {
          customerId = session.customerId;
        }
      } catch (e) {
        // Invalid token, continue without customer ID (guest checkout)
      }
    }

    // Create order - ensure all values are valid numbers (not null/undefined)
    // PocketBase requires all number fields to be actual numbers, not null
    // Use explicit variable assignment to ensure values are never undefined
    const finalTaxCgst = (typeof taxCgst === 'number' && !isNaN(taxCgst)) ? taxCgst : 0;
    const finalTaxSgst = (typeof taxSgst === 'number' && !isNaN(taxSgst)) ? taxSgst : 0;
    const finalTaxIgst = (typeof taxIgst === 'number' && !isNaN(taxIgst)) ? taxIgst : 0;
    const finalSubtotal = (typeof subtotal === 'number' && !isNaN(subtotal)) ? Math.round(subtotal) : 0;
    const finalTotal = (typeof total === 'number' && !isNaN(total)) ? Math.round(total) : 0;
    
    const orderData: any = {
      tenantId: tenant.id,
      locationId: location.id,
      channel: 'pickup', // Default, can be made configurable
      status: 'placed',
      subtotal: finalSubtotal,
      taxCgst: finalTaxCgst,
      taxSgst: finalTaxSgst,
      taxIgst: finalTaxIgst,
      total: finalTotal,
      timestamps: {
        placedAt: new Date().toISOString(),
      },
    };
    
    // Verify all tax fields are present and are numbers
    console.log('Final orderData before sending to PocketBase:', JSON.stringify({
      orderDataKeys: Object.keys(orderData),
      taxCgst: orderData.taxCgst,
      taxSgst: orderData.taxSgst,
      taxIgst: orderData.taxIgst,
      taxCgstType: typeof orderData.taxCgst,
      taxSgstType: typeof orderData.taxSgst,
      taxIgstType: typeof orderData.taxIgst,
      taxCgstIsNumber: typeof orderData.taxCgst === 'number',
      taxSgstIsNumber: typeof orderData.taxSgst === 'number',
      taxIgstIsNumber: typeof orderData.taxIgst === 'number',
    }, null, 2));

    // Log for debugging - show the actual orderData object
    console.log('Creating order with data:', JSON.stringify({
      orderData: orderData,
      taxValues: {
        taxCgst: orderData.taxCgst,
        taxSgst: orderData.taxSgst,
        taxIgst: orderData.taxIgst,
        taxCgstType: typeof orderData.taxCgst,
        taxSgstType: typeof orderData.taxSgst,
        taxIgstType: typeof orderData.taxIgst,
        taxCgstIsDefined: orderData.taxCgst !== undefined,
        taxSgstIsDefined: orderData.taxSgst !== undefined,
        taxIgstIsDefined: orderData.taxIgst !== undefined,
      },
      locationStateCode,
    }, null, 2));

    if (customerId) {
      orderData.customerId = customerId;
    }

    // Double-check: ensure tax fields are definitely in the object as numbers
    // Sometimes JavaScript can have weird issues with object property assignment
    orderData['taxCgst'] = Number(finalTaxCgst);
    orderData['taxSgst'] = Number(finalTaxSgst);
    orderData['taxIgst'] = Number(finalTaxIgst);
    
    // Verify one more time
    if (!('taxCgst' in orderData) || orderData.taxCgst === undefined || orderData.taxCgst === null) {
      console.error('ERROR: taxCgst is missing from orderData!', orderData);
      orderData.taxCgst = 0;
    }
    if (!('taxSgst' in orderData) || orderData.taxSgst === undefined || orderData.taxSgst === null) {
      console.error('ERROR: taxSgst is missing from orderData!', orderData);
      orderData.taxSgst = 0;
    }
    if (!('taxIgst' in orderData) || orderData.taxIgst === undefined || orderData.taxIgst === null) {
      console.error('ERROR: taxIgst is missing from orderData!', orderData);
      orderData.taxIgst = 0;
    }
    
    console.log('Final verification - orderData keys and tax values:', {
      keys: Object.keys(orderData),
      hasTaxCgst: 'taxCgst' in orderData,
      hasTaxSgst: 'taxSgst' in orderData,
      hasTaxIgst: 'taxIgst' in orderData,
      taxCgst: orderData.taxCgst,
      taxSgst: orderData.taxSgst,
      taxIgst: orderData.taxIgst,
      orderDataString: JSON.stringify(orderData),
    });
    
    let order;
    try {
      order = await pb.collection('orders').create(orderData);
    } catch (error: any) {
      // PocketBase ClientResponseError structure:
      // error.response.data.data = { fieldName: { code: "...", message: "..." } }
      // error.response.data.message = "Something went wrong..."
      // error.status = 400
      
      console.error('PocketBase error caught:', {
        errorType: error.constructor?.name,
        errorKeys: Object.keys(error),
        message: error.message,
        status: error.status,
        code: error.code,
        response: error.response,
        data: error.data,
        responseData: error.response?.data,
        responseDataData: error.response?.data?.data,
        fullError: error,
      });
      
      // Try to extract validation errors from various possible locations
      let errorData: any = {};
      if (error.response?.data?.data) {
        errorData = error.response.data.data;
      } else if (error.data?.data) {
        errorData = error.data.data;
      } else if (error.data) {
        errorData = error.data;
      }
      
      console.error('Extracted errorData:', JSON.stringify(errorData, null, 2));
      console.error('Order data being sent:', JSON.stringify(orderData, null, 2));
      
      // Extract validation errors
      let errorMessages: string[] = [];
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, err]: [string, any]) => {
          if (err) {
            if (typeof err === 'object') {
              if (err.message) {
                errorMessages.push(`${field}: ${err.message}`);
              } else if (err.code) {
                errorMessages.push(`${field}: ${err.code}`);
              } else {
                errorMessages.push(`${field}: ${JSON.stringify(err)}`);
              }
            } else {
              errorMessages.push(`${field}: ${err}`);
            }
          }
        });
      }
      
      const errorMsg = errorMessages.length > 0 
        ? `Validation failed: ${errorMessages.join('; ')}`
        : (error.response?.data?.message || error.message || 'Order creation failed');
      
      // Re-throw with better error message
      const enhancedError = new Error(errorMsg);
      (enhancedError as any).status = error.status || 400;
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }

    // Create order items
    for (const item of items) {
      const menuItem = await pb.collection('menuItem').getOne(item.menuItemId);
      let unitPrice = menuItem.basePrice;

      // Add option prices
      if (item.options) {
        for (const option of item.options) {
          for (const valueId of option.valueIds) {
            try {
              const optionValue = await pb.collection('optionValue').getOne(valueId);
              unitPrice += optionValue.priceDelta;
            } catch (error) {
              // Skip
            }
          }
        }
      }

      await pb.collection('orderItem').create({
        orderId: order.id,
        menuItemId: item.menuItemId,
        nameSnapshot: menuItem.name,
        qty: item.quantity,
        unitPrice,
        optionsSnapshot: item.options || [],
      });
    }

    return NextResponse.json({
      orderId: order.id,
      total,
      amount: total, // For Razorpay (in paise)
    });
  } catch (error: any) {
    console.error('Error creating order:', {
      message: error.message,
      stack: error.stack,
      status: error.status,
      code: error.code,
      response: error.response?.data || error.data,
      name: error.name,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    });
    
    // Extract detailed error message
    let errorMessage = error.message || 'Failed to create order';
    if (error.response?.data?.data) {
      const validationErrors = error.response.data.data;
      const errorDetails = Object.entries(validationErrors)
        .map(([field, err]: [string, any]) => {
          if (err && typeof err === 'object') {
            if (err.message) return `${field}: ${err.message}`;
            if (err.code) return `${field}: ${err.code}`;
          }
          return `${field}: ${JSON.stringify(err)}`;
        })
        .join('; ');
      if (errorDetails) {
        errorMessage = `Validation failed: ${errorDetails}`;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.response?.data || error.data,
      },
      { status: error.status || 500 }
    );
  }
}




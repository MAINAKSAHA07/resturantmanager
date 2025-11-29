import { NextRequest, NextResponse } from 'next/server';
import { extractBrandKey } from '@restaurant/lib';
import { calculateGSTForItems } from '@restaurant/lib';
import PocketBase from 'pocketbase';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      );
    }
    
    const { items, couponCode, tableContext: tableContextFromBody } = body;


    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    // Validate items structure
    for (const item of items) {
      if (!item.menuItemId) {
        console.error('Invalid item structure:', item);
        return NextResponse.json({ error: 'Each item must have a menuItemId' }, { status: 400 });
      }
      if (!item.quantity || item.quantity < 1) {
        console.error('Invalid item quantity:', item);
        return NextResponse.json({ error: 'Each item must have a quantity >= 1' }, { status: 400 });
      }
    }

    // Get tenant from cookie or hostname
    const cookies = request.cookies;
    const tenantCookie = cookies.get('selected_tenant')?.value;
    const hostname = request.headers.get('host') || '';
    const extractedBrandKey = extractBrandKey(hostname);
    const brandKey = tenantCookie || extractedBrandKey || 'saffron';

    // Direct PocketBase connection
    const pbUrl = process.env.POCKETBASE_URL || process.env.AWS_POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set' }, { status: 500 });
    }

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get tenant - try exact match first, then case-insensitive
    let tenants = await pb.collection('tenant').getList(1, 1, {
      filter: `key = "${brandKey}"`,
    });

    // If not found, try case-insensitive search
    if (tenants.items.length === 0) {
      const allTenants = await pb.collection('tenant').getList(1, 100);
      const matchingTenant = allTenants.items.find((t: any) => 
        t.key?.toLowerCase() === brandKey.toLowerCase()
      );
      if (matchingTenant) {
        tenants = {
          page: 1,
          perPage: 1,
          totalItems: 1,
          totalPages: 1,
          items: [matchingTenant],
        };
      }
    }
    
    if (tenants.items.length === 0) {
      console.error('[Order Create] Tenant not found:', {
        brandKey,
        availableTenants: (await pb.collection('tenant').getList(1, 100)).items.map((t: any) => t.key),
      });
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
    let total = Math.round(subtotal + totalTax);

    // Apply coupon discount if provided
    let couponId: string | null = null;
    let discountAmount: number = 0;
    let couponDebug: any = null;


    if (couponCode) {
      try {
        // Use the tenant we already found above
        const tenantId = tenant.id;

        // Find and validate coupon
        const couponCodeUpper = couponCode.toUpperCase().trim();
        
        // Try robust filter first (handles relation fields)
        let coupons;
        try {
          coupons = await pb.collection('coupon').getList(1, 10, {
            filter: `code = "${couponCodeUpper}" && (tenantId = "${tenantId}" || tenantId ~ "${tenantId}")`,
          });
        } catch (filterError: any) {
          // Fallback: fetch all matching codes and filter client-side
          const allCoupons = await pb.collection('coupon').getList(1, 200, {
            filter: `code = "${couponCodeUpper}"`,
          });
          coupons = {
            items: allCoupons.items.filter((coupon: any) => {
              const couponTenantId = Array.isArray(coupon.tenantId) ? coupon.tenantId[0] : coupon.tenantId;
              return couponTenantId === tenantId;
            }),
          };
        }

        if (coupons.items.length > 0) {
            const coupon = coupons.items[0];
            const now = new Date();
            const validFrom = new Date(coupon.validFrom);
            const validUntil = new Date(coupon.validUntil);

            // Validate coupon
            const isActive = coupon.isActive;
            const isValidDate = now >= validFrom && now <= validUntil;
            const hasUsageLimit = !!coupon.usageLimit;
            const usageLimitReached = hasUsageLimit && (coupon.usedCount || 0) >= coupon.usageLimit;

            // Check minimum order amount (should be on subtotal + tax, not just subtotal)
            const orderTotalForValidation = subtotal + totalTax;
            const minOrderMet = orderTotalForValidation >= (coupon.minOrderAmount || 0);

            if (isActive && isValidDate && !usageLimitReached && minOrderMet) {
              // Calculate discount on total (subtotal + tax)
              const totalBeforeDiscount = total;
              if (coupon.discountType === 'percentage') {
                // discountValue is stored as percentage * 100 (e.g., 10% = 1000)
                discountAmount = Math.round((total * coupon.discountValue) / 10000);
                if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                  discountAmount = coupon.maxDiscountAmount;
                }
              } else {
                // Fixed discount - already in paise
                discountAmount = coupon.discountValue;
              }

              // Don't exceed order total
              if (discountAmount > total) {
                discountAmount = total;
              }

              total = Math.max(0, total - discountAmount);
              couponId = coupon.id;


              // Increment used count safely
              try {
                // First, check if usedCount field exists in the coupon schema
                let usedCountFieldExists = true;
                try {
                  const couponCollection = await pb.collections.getOne('coupon');
                  usedCountFieldExists = couponCollection.schema.some((field: any) => field.name === 'usedCount');
                } catch (schemaError: any) {
                  // Assume field exists if we can't check
                }

                if (!usedCountFieldExists) {
                  console.error('❌ CRITICAL: usedCount field does not exist in coupon collection!');
                  console.error('[Order Create] Cannot update coupon usage count - field missing from schema');
                  couponDebug = { 
                    error: 'usedCount field does not exist in coupon collection',
                    action: 'Please add usedCount field to coupon collection schema',
                  };
                } else {
                  const currentCount = Number(coupon.usedCount) || 0;
                  const newCount = currentCount + 1;

                  const updatedCoupon = await pb.collection('coupon').update(coupon.id, {
                    usedCount: newCount,
                  });

                  // Verify the update succeeded
                  const savedCount = Number(updatedCoupon.usedCount) || 0;
                  
                  // Verify by fetching the coupon again
                  try {
                    const verifiedCoupon = await pb.collection('coupon').getOne(coupon.id);
                    const dbCount = Number(verifiedCoupon.usedCount) || 0;
                    
                    if (dbCount !== newCount) {
                      console.error('❌ Coupon usedCount was not saved to database', {
                        couponId: coupon.id,
                        expected: newCount,
                        dbValue: dbCount,
                      });
                      couponDebug = {
                        error: 'usedCount not saved to database',
                        expected: newCount,
                        dbValue: dbCount,
                      };
                    }
                  } catch (verifyError: any) {
                    // Only log if update response doesn't match
                    if (savedCount !== newCount) {
                      console.error('⚠️ Coupon usedCount update may have failed', {
                        couponId: coupon.id,
                        expected: newCount,
                        saved: savedCount,
                      });
                    }
                  }
                }
              } catch (updateError: any) {
                console.error('Failed to update coupon usage count:', updateError.message);
                // Don't fail the order if usage count update fails
                couponDebug = { 
                  error: 'Failed to update usage count', 
                  details: updateError.message,
                };
              }
            } else {
              console.warn('[Order Create] Coupon validation failed:', coupon.code);
              couponDebug = {
                validationFailed: true,
                reasons: { 
                  isActive, 
                  isValidDate, 
                  usageLimitReached, 
                  minOrderMet,
                }
              };
            }
          } else {
            console.error('[Order Create] Coupon not found:', couponCodeUpper);
            couponDebug = { 
              notFound: true, 
              code: couponCodeUpper,
              tenantId,
              message: `Coupon "${couponCodeUpper}" not found for tenant ${tenantId}`,
            };
          }
      } catch (couponError: any) {
        console.error('[Order Create] Error applying coupon:', couponError.message);
        couponDebug = { 
          error: couponError.message,
          code: couponCode,
        };
        // Continue without coupon if there's an error
      }
    } else {
    }


    // Get customer ID from session token if available
    let customerId = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const session = JSON.parse(Buffer.from(token, 'base64').toString());
        if (session.customerId && session.exp > Date.now()) {
          // Validate that customer exists in local PocketBase
          try {
            await pb.collection('customer').getOne(session.customerId);
            customerId = session.customerId;
          } catch (customerError: any) {
            // Customer doesn't exist in local DB, skip customerId (guest checkout)
            console.warn('[Order Create] Customer ID from session does not exist in local DB:', {
              customerId: session.customerId,
              error: customerError.message,
            });
            // Don't set customerId - allow guest checkout
          }
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
    // IMPORTANT: 'total' variable already has discount applied (line 218: total = Math.max(0, total - discountAmount))
    // So finalTotal should use this discounted total
    const finalTotal = (typeof total === 'number' && !isNaN(total)) ? Math.round(total) : 0;

    // Ensure discountAmount and couponId are properly set
    const finalDiscountAmount = Math.round(discountAmount || 0);
    const finalCouponId = couponId || null;


    // Check for table context from cookie or request body
    let tableId: string | null = null;
    let tableLabel: string | null = null;
    let channel = 'pickup'; // Default

    // Try to get table context from request body first (more reliable)
    let tableContext: any = null;
    if (tableContextFromBody && tableContextFromBody.tableId && tableContextFromBody.tableName) {
      tableContext = tableContextFromBody;
      console.log('[Order Create] Table context from request body:', tableContext);
    } else {
      // Fallback to cookie
      const tableContextCookie = cookies.get('tableContext')?.value;
      console.log('[Order Create] Table context cookie:', tableContextCookie ? 'Found' : 'Not found');
      
      if (tableContextCookie) {
        try {
          tableContext = JSON.parse(decodeURIComponent(tableContextCookie));
          console.log('[Order Create] Parsed table context from cookie:', tableContext);
        } catch (e) {
          console.error('[Order Create] ❌ Failed to parse table context cookie:', e);
        }
      }
    }
    
    if (tableContext && tableContext.tableId && tableContext.tableName) {
      // Verify table belongs to current tenant and location
      const tableTenantId = Array.isArray(tableContext.tenantId) 
        ? tableContext.tenantId[0] 
        : tableContext.tenantId;
      const tableLocationId = Array.isArray(tableContext.locationId)
        ? tableContext.locationId[0]
        : tableContext.locationId;

      console.log('[Order Create] Comparing tenant/location:', {
        tableTenantId,
        currentTenantId: tenant.id,
        tableLocationId,
        currentLocationId: location.id,
        match: tableTenantId === tenant.id && tableLocationId === location.id,
      });

      if (tableTenantId === tenant.id && tableLocationId === location.id) {
        tableId = tableContext.tableId;
        tableLabel = tableContext.tableName;
        channel = 'dine_in';
        console.log('[Order Create] ✅ Table context validated - setting dine_in with table:', tableLabel);
      } else {
        console.warn('[Order Create] ⚠️ Table context tenant/location mismatch - using pickup');
      }
    } else {
      console.log('[Order Create] No valid table context found - using pickup');
    }

    const orderData: any = {
      tenantId: tenant.id,
      locationId: location.id,
      channel: channel,
      status: 'placed',
      subtotal: finalSubtotal,
      taxCgst: finalTaxCgst,
      taxSgst: finalTaxSgst,
      taxIgst: finalTaxIgst,
      total: finalTotal, // This already has discount applied
      discountAmount: finalDiscountAmount, // Always include, even if 0
      timestamps: {
        placedAt: new Date().toISOString(),
      },
    };

    // Set couponId - only include if it exists (PocketBase relation fields)
    if (finalCouponId) {
      orderData.couponId = String(finalCouponId);
    }
    // If no coupon, don't set couponId - PocketBase will default to null for relation fields

    if (customerId) {
      orderData.customerId = customerId;
    }

    // Add table information if available
    if (tableId) {
      orderData.tableId = tableId;
      console.log('[Order Create] ✅ Added tableId to order:', tableId);
    }
    if (tableLabel) {
      orderData.tableLabel = tableLabel;
      console.log('[Order Create] ✅ Added tableLabel to order:', tableLabel);
    }
    
    console.log('[Order Create] Final order data:', {
      channel: orderData.channel,
      tableId: orderData.tableId || 'none',
      tableLabel: orderData.tableLabel || 'none',
    });

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

    // CRITICAL: Final verification and setting of discountAmount and couponId
    // Do this AFTER all other modifications to ensure values are correct
    orderData.discountAmount = Math.round(finalDiscountAmount);
    
    // Always set couponId explicitly - use null if no coupon (PocketBase relation fields)
    if (finalCouponId) {
      orderData.couponId = String(finalCouponId);
    } else {
      // Explicitly set to null to prevent PocketBase from defaulting to empty array
      orderData.couponId = null;
    }
    



    // Ensure taxIgst is set (required field)
    if (orderData.taxIgst === undefined || orderData.taxIgst === null) {
      orderData.taxIgst = 0;
      console.warn('[Order Create] taxIgst was missing, setting to 0');
    }

    // Check if discountAmount field exists in the schema before creating order
    let discountAmountFieldExists = true;
    try {
      const ordersCollection = await pb.collections.getOne('orders');
      discountAmountFieldExists = ordersCollection.schema.some((field: any) => field.name === 'discountAmount');
      console.log('[Order Create] discountAmount field check:', {
        exists: discountAmountFieldExists,
        fieldNames: ordersCollection.schema.map((f: any) => f.name),
      });
      
      if (!discountAmountFieldExists) {
        console.warn('[Order Create] ⚠️  WARNING: discountAmount field does not exist in orders collection!');
        console.warn('[Order Create] Run: node pocketbase/scripts/add-coupon-fields-to-orders.js');
        // Remove discountAmount from orderData if field doesn't exist
        delete orderData.discountAmount;
      }
    } catch (schemaError: any) {
      console.warn('[Order Create] Could not check schema, assuming discountAmount exists:', schemaError.message);
    }

    let order;
    try {
      order = await pb.collection('orders').create(orderData);

      // Verify what was actually saved
      const savedDiscount = order.discountAmount || 0;
      const savedCoupon = Array.isArray(order.couponId) ? order.couponId[0] : order.couponId;


      // Warn if discount wasn't saved correctly
      if (finalDiscountAmount > 0) {
        if (!discountAmountFieldExists) {
          console.error('❌ CRITICAL: Discount amount field does not exist in database!', {
            expected: finalDiscountAmount,
            saved: savedDiscount,
            couponCode: couponCode || 'NONE',
            action: 'Run: node pocketbase/scripts/add-coupon-fields-to-orders.js',
          });
        } else if (savedDiscount !== finalDiscountAmount) {
          console.error('⚠️  WARNING: Discount amount was not saved correctly!', {
            expected: finalDiscountAmount,
            saved: savedDiscount,
            difference: finalDiscountAmount - savedDiscount,
            couponCode: couponCode || 'NONE',
          });
        }
      }

      if (finalCouponId && savedCoupon !== finalCouponId) {
        console.error('⚠️  WARNING: Coupon ID was not saved correctly!', {
          expected: finalCouponId,
          saved: savedCoupon,
          couponCode: couponCode || 'NONE',
        });
      }

      // FORCE UPDATE: If values were not saved correctly, try to update them explicitly
      const needsUpdate = (finalDiscountAmount > 0 && savedDiscount !== finalDiscountAmount) ||
        (finalCouponId && savedCoupon !== finalCouponId) ||
        (Array.isArray(order.couponId) && order.couponId.length === 0 && finalCouponId);
      
      if (needsUpdate) {
        
        try {
          const updateData: any = {
            discountAmount: finalDiscountAmount, // Always update discountAmount
          };
          
          // Only set couponId if we have one, otherwise explicitly set to null
          if (finalCouponId) {
            updateData.couponId = finalCouponId;
          } else {
            // Explicitly set to null to clear empty array
            updateData.couponId = null;
          }

          await pb.collection('orders').update(order.id, updateData);
          // Re-fetch the order to get updated values
          const updatedOrder = await pb.collection('orders').getOne(order.id);
          order.discountAmount = updatedOrder.discountAmount || 0;
          order.couponId = Array.isArray(updatedOrder.couponId) 
            ? (updatedOrder.couponId.length > 0 ? updatedOrder.couponId[0] : null)
            : (updatedOrder.couponId || null);
        } catch (updateError: any) {
          console.error('[Order Create] ❌ Force update failed:', {
            error: updateError.message,
            status: updateError.status,
            data: updateError.response?.data,
          });
        }
      }
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

      console.error('[Order Create] Full error details:', {
        errorMsg,
        errorMessages,
        orderData: JSON.stringify(orderData, null, 2),
        errorResponse: error.response?.data,
        errorStatus: error.status,
        tenantId: orderData.tenantId,
        locationId: orderData.locationId,
        hasRequiredFields: {
          tenantId: !!orderData.tenantId,
          locationId: !!orderData.locationId,
          channel: !!orderData.channel,
          status: !!orderData.status,
          subtotal: orderData.subtotal !== undefined,
          taxIgst: orderData.taxIgst !== undefined,
          total: orderData.total !== undefined,
        },
      });

      // Re-throw with better error message
      const enhancedError = new Error(errorMsg);
      (enhancedError as any).status = error.status || 400;
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }

    // Create order items

    const createdItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {

        const menuItem = await pb.collection('menuItem').getOne(item.menuItemId);
        let unitPrice = Number(menuItem.basePrice) || 0;

        // Add option prices
        if (item.options && Array.isArray(item.options)) {
          for (const option of item.options) {
            if (option.valueIds && Array.isArray(option.valueIds)) {
              for (const valueId of option.valueIds) {
                try {
                  const optionValue = await pb.collection('optionValue').getOne(valueId);
                  unitPrice += Number(optionValue.priceDelta) || 0;
                } catch (error) {
                  console.warn(`Option value ${valueId} not found, skipping`);
                }
              }
            }
          }
        }

        const orderItemData = {
          orderId: order.id,
          menuItemId: item.menuItemId,
          nameSnapshot: menuItem.name,
          qty: Number(item.quantity) || 1,
          unitPrice: Math.round(unitPrice),
          optionsSnapshot: item.options || [],
        };

        const createdItem = await pb.collection('orderItem').create(orderItemData);
        createdItems.push(createdItem.id);
      } catch (itemError: any) {
        console.error(`❌ Error creating order item ${i + 1}:`, {
          menuItemId: item.menuItemId,
          error: itemError.message,
          status: itemError.status,
          response: itemError.response?.data,
        });
        // Continue with other items even if one fails
      }
    }


    if (createdItems.length === 0 && items.length > 0) {
      console.error('⚠️  WARNING: No order items were created!');
    }

    // Get final saved values from order
    const finalSavedDiscount = order.discountAmount || 0;
    const finalSavedCoupon = Array.isArray(order.couponId) 
      ? (order.couponId.length > 0 ? order.couponId[0] : null)
      : (order.couponId || null);
    
    return NextResponse.json({
      orderId: order.id,
      total: order.total,
      amount: order.total, // For Razorpay (in paise)
      discountAmount: finalSavedDiscount,
      couponId: finalSavedCoupon,
      couponDebug, // Include debug info
    });
  } catch (error: any) {
    console.error('Error creating order:', error.message);

    // Helper to safely serialize error details
    const safeSerialize = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (typeof obj !== 'object') return obj;
      if (obj instanceof Error) return { message: obj.message, name: obj.name };
      
      try {
        // Try to serialize, but catch circular references
        const seen = new WeakSet();
        const serialize = (val: any): any => {
          if (val === null || val === undefined) return null;
          if (typeof val !== 'object') return val;
          if (seen.has(val)) return '[Circular]';
          if (val instanceof Error) return { message: val.message, name: val.name };
          if (val instanceof Date) return val.toISOString();
          if (Array.isArray(val)) return val.map(serialize);
          
          seen.add(val);
          const result: any = {};
          for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
              try {
                result[key] = serialize(val[key]);
              } catch {
                result[key] = '[Unable to serialize]';
              }
            }
          }
          seen.delete(val);
          return result;
        };
        return serialize(obj);
      } catch {
        return { message: 'Unable to serialize error details' };
      }
    };

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

    // Safely serialize error details
    const errorDetails = error.response?.data || error.data;
    const safeDetails = errorDetails ? safeSerialize(errorDetails) : undefined;

    return NextResponse.json(
      {
        error: errorMessage,
        ...(safeDetails && { details: safeDetails }),
      },
      { status: error.status || 500 }
    );
  }
}




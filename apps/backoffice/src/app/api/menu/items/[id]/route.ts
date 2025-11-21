import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('pb_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    const item = await adminPb.collection('menuItem').getOne(params.id, {
      expand: 'categoryId,tenantId,locationId',
      fields: 'id,tenantId,locationId,categoryId,name,description,image,basePrice,taxRate,hsnSac,isActive,availability,created,updated',
    });
    
    // Ensure availability is always included, fallback to isActive if missing
    if (!item.availability && item.isActive !== undefined) {
      item.availability = item.isActive !== false ? 'available' : 'not available';
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error fetching item:', {
      message: error.message,
      status: error.status || error.response?.status,
      response: error.response?.data || error.response,
    });
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('pb_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    // Handle FormData for file upload
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const basePrice = parseFloat(formData.get('basePrice') as string);
    const taxRate = parseFloat(formData.get('taxRate') as string) || 5;
    const categoryId = formData.get('categoryId') as string;
    // Get the existing item first to use as fallback for isActive
    const existingItem = await adminPb.collection('menuItem').getOne(params.id);
    const itemTenantId = Array.isArray(existingItem.tenantId) 
      ? existingItem.tenantId[0] 
      : existingItem.tenantId;
    const itemLocationId = Array.isArray(existingItem.locationId) 
      ? existingItem.locationId[0] 
      : existingItem.locationId;
    
    const availabilityValue = formData.get('availability') || formData.get('isActive');
    // Handle availability: 'available' or 'not available'
    // Normalize to lowercase to ensure consistency
    // Support legacy boolean values for backward compatibility
    let availability: string;
    if (availabilityValue === null || availabilityValue === undefined || availabilityValue === '') {
      // Use existing value or default to 'available'
      const existing = existingItem.availability || existingItem.isActive;
      if (typeof existing === 'boolean') {
        availability = existing ? 'available' : 'not available';
      } else {
        // Normalize existing value to lowercase
        const normalizedExisting = String(existing).toLowerCase().trim();
        availability = (normalizedExisting === 'not available' || normalizedExisting === 'notavailable') 
          ? 'not available' 
          : 'available';
      }
      console.log('[API] availability not provided, using existing value:', availability);
    } else {
      const strValue = String(availabilityValue).toLowerCase().trim();
      // Support both new format and legacy boolean - normalize to lowercase
      if (strValue === 'true' || strValue === '1' || strValue === 'available') {
        availability = 'available';
      } else if (strValue === 'false' || strValue === '0' || strValue === 'not available' || strValue === 'notavailable') {
        availability = 'not available'; // Always lowercase
      } else {
        availability = 'available'; // Default
      }
    }
    
    // Ensure availability is always lowercase for consistency
    availability = availability.toLowerCase();
    
    console.log('[API] availability value:', { 
      raw: availabilityValue, 
      parsed: availability,
      existing: existingItem.availability || existingItem.isActive,
      type: typeof availabilityValue 
    });
    
    const hsnSac = formData.get('hsnSac') as string || '';
    const imageFile = formData.get('image') as File | null;
    const removeImage = formData.get('removeImage') === 'true';

    // Check for duplicate name (excluding current item)
    if (name.toLowerCase().trim() !== existingItem.name.toLowerCase().trim()) {
      const allItems = await adminPb.collection('menuItem').getList(1, 1000);
      const duplicate = allItems.items.find((item: any) => {
        const itemId = item.id;
        const itemTenantIdCheck = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
        const itemLocationIdCheck = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
        return itemId !== params.id &&
               item.name.toLowerCase().trim() === name.toLowerCase().trim() &&
               itemTenantIdCheck === itemTenantId &&
               itemLocationIdCheck === itemLocationId;
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `A menu item with the name "${name}" already exists in this location.` },
          { status: 400 }
        );
      }
    }
    
    // Find and update all duplicates with the same name (to keep them in sync)
    // This ensures that when availability changes, all duplicates are updated
    const allItems = await adminPb.collection('menuItem').getList(1, 1000);
    const duplicates = allItems.items.filter((item: any) => {
      const itemTenantIdCheck = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
      const itemLocationIdCheck = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
      return item.id !== params.id &&
             item.name.toLowerCase().trim() === name.toLowerCase().trim() &&
             itemTenantIdCheck === itemTenantId &&
             itemLocationIdCheck === itemLocationId;
    });
    
    if (duplicates.length > 0) {
      console.log(`[API] Found ${duplicates.length} duplicate items with same name, updating availability to match`);
      // Update all duplicates to have the same availability - use FormData to ensure it saves
      for (const duplicate of duplicates) {
        try {
          const duplicateData = new FormData();
          duplicateData.append('availability', availability);
          await adminPb.collection('menuItem').update(duplicate.id, duplicateData);
          console.log(`[API] Updated duplicate ${duplicate.id} (${duplicate.name}) to availability: ${availability}`);
        } catch (error: any) {
          console.error(`[API] Error updating duplicate ${duplicate.id}:`, error.message);
        }
      }
    }

    // Always use FormData - PocketBase has issues saving text fields with object updates
    // FormData ensures all fields including availability are saved correctly
    const itemData = new FormData();
    itemData.append('tenantId', itemTenantId);
    itemData.append('locationId', itemLocationId);
    itemData.append('categoryId', categoryId);
    itemData.append('name', name);
    itemData.append('description', description);
    itemData.append('basePrice', Math.round(basePrice * 100).toString()); // Convert to paise
    itemData.append('taxRate', (taxRate || 5).toString());
    itemData.append('hsnSac', hsnSac);
    // Send availability as string: 'available' or 'not available'
    itemData.append('availability', availability);
    
    console.log('[API] Using FormData with availability:', availability);
    
    // Handle image update
    if (removeImage) {
      itemData.append('image', '');
    } else if (imageFile && imageFile.size > 0) {
      itemData.append('image', imageFile);
    }
    // If neither, don't append image field (keeps existing image)
    
    // Log what we're sending
    console.log('[API] FormData entries being sent:');
    for (const [key, value] of itemData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    let item;
    try {
      item = await adminPb.collection('menuItem').update(params.id, itemData);
      console.log('[API] Update response - availability:', item.availability);
    } catch (updateError: any) {
      console.error('[API] Update error:', {
        message: updateError.message,
        status: updateError.status,
        data: updateError.data || updateError.response
      });
      throw updateError;
    }
    
    // ALWAYS update availability separately to ensure it saves correctly
    // This is a workaround for PocketBase FormData issues with text fields
    try {
      const availabilityData = new FormData();
      availabilityData.append('availability', availability);
      await adminPb.collection('menuItem').update(params.id, availabilityData);
      console.log('[API] Availability updated separately to:', availability);
    } catch (availabilityError: any) {
      console.error('[API] Failed to update availability separately:', availabilityError.message);
      // Continue anyway - we'll force it in the response
    }
    
    // Re-fetch to get the latest data
    const verifyItem = await adminPb.collection('menuItem').getOne(params.id);
    console.log('[API] Final verification - availability:', verifyItem.availability);
    item = verifyItem;

    // CRITICAL: Ensure availability is always in the response with the value we tried to save
    // If PocketBase didn't save it, we still return the correct value so UI shows it
    if (item.availability !== availability) {
      console.warn('[API] PocketBase did not save availability correctly. Forcing correct value in response.');
      item.availability = availability;
    }
    
    // Normalize availability to lowercase for consistency
    if (item.availability) {
      const normalized = String(item.availability).toLowerCase().trim();
      item.availability = (normalized === 'not available' || normalized === 'notavailable') 
        ? 'not available' 
        : 'available';
    } else if (item.isActive !== undefined) {
      // Fallback to isActive if availability is still missing
      item.availability = item.isActive !== false ? 'available' : 'not available';
    } else {
      // Final fallback
      item.availability = 'available';
    }
    
    console.log('[API] Returning item with availability:', item.availability);
    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error updating item:', {
      message: error.message,
      status: error.status || error.response?.status,
      response: error.response?.data || error.response,
    });
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('pb_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    // Check if item exists
    try {
      await adminPb.collection('menuItem').getOne(params.id);
    } catch (error: any) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: 'Menu item not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Delete the item
    await adminPb.collection('menuItem').delete(params.id);

    return NextResponse.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting item:', {
      message: error.message,
      status: error.status || error.response?.status,
      response: error.response?.data || error.response,
    });
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete item' },
      { status: error.status || 500 }
    );
  }
}


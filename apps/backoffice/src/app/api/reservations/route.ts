import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';
import { hasPermission } from '@/lib/permissions';
import { isMasterUser, hasTenantAccess, User } from '@/lib/user-utils';

export async function GET(request: NextRequest) {
  try {
    // Direct PocketBase connection
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get user info for permission check
    const cookieStore = cookies();
    const token = cookieStore.get('pb_auth_token')?.value;
    let user: User | null = null;
    let isMaster = false;

    if (token) {
      try {
        const userPb = new PocketBase(pbUrl);
        userPb.authStore.save(token, null);
        try {
          const authData = await userPb.collection('users').authRefresh({ expand: 'tenants' });
          const record = authData.record as any;
          user = {
            id: record.id,
            email: record.email,
            name: record.name,
            role: record.role,
            isMaster: record.isMaster === true,
            tenants: record.tenants || [],
            expand: record.expand,
          } as User;
          isMaster = isMasterUser(user);
        } catch (e) {
          // Try admin token
          try {
            const adminAuth = await userPb.admins.authRefresh();
            isMaster = true;
            user = {
              id: adminAuth.admin?.id || 'admin',
              email: adminAuth.admin?.email || adminEmail,
              name: 'Administrator',
              role: 'admin',
              isMaster: true,
            } as User;
          } catch (adminErr) {
            // Can't get user, but continue with admin client
          }
        }
      } catch (e) {
        // Continue with admin client
      }
    }

    // Check permission
    if (user && !hasPermission(user, 'reservations.view')) {
      return NextResponse.json(
        { error: 'You do not have permission to view reservations' },
        { status: 403 }
      );
    }

    // Get selected tenant from cookies
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    // Fetch all reservations
    const allReservations = await pb.collection('reservation').getList(1, 500, {
      sort: '-startTime',
      expand: 'customerId,tenantId,locationId',
    });

    // Filter by tenant if not master user
    let filteredReservations = allReservations.items;
    
    if (!isMaster && tenantId) {
      // Non-master users: filter by selected tenant
      filteredReservations = allReservations.items.filter((reservation: any) => {
        const resTenantId = Array.isArray(reservation.tenantId) ? reservation.tenantId[0] : reservation.tenantId;
        return resTenantId === tenantId;
      });
    } else if (!isMaster && user) {
      // Non-master users without tenant selected: filter by user's assigned tenants
      const userTenants = user.tenants || [];
      if (userTenants.length > 0) {
        filteredReservations = allReservations.items.filter((reservation: any) => {
          const resTenantId = Array.isArray(reservation.tenantId) ? reservation.tenantId[0] : reservation.tenantId;
          return userTenants.includes(resTenantId);
        });
      } else {
        // User has no tenants assigned
        filteredReservations = [];
      }
    }
    // Master users: show all reservations (no filtering)

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const dateFilter = searchParams.get('date');

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filteredReservations = filteredReservations.filter((r: any) => r.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filteredReservations = filteredReservations.filter((r: any) => {
        const resDate = new Date(r.startTime);
        return resDate.toDateString() === filterDate.toDateString();
      });
    }

    console.log(`Found ${filteredReservations.length} reservations`);

    return NextResponse.json({ 
      reservations: filteredReservations,
      total: filteredReservations.length,
    });
  } catch (error: any) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Direct PocketBase connection
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get user info for permission check
    const cookieStore = cookies();
    const token = cookieStore.get('pb_auth_token')?.value;
    let user: User | null = null;

    if (token) {
      try {
        const userPb = new PocketBase(pbUrl);
        userPb.authStore.save(token, null);
        try {
          const authData = await userPb.collection('users').authRefresh({ expand: 'tenants' });
          const record = authData.record as any;
          user = {
            id: record.id,
            email: record.email,
            name: record.name,
            role: record.role,
            isMaster: record.isMaster === true,
            tenants: record.tenants || [],
            expand: record.expand,
          } as User;
        } catch (e) {
          // Try admin token
          try {
            const adminAuth = await userPb.admins.authRefresh();
            user = {
              id: adminAuth.admin?.id || 'admin',
              email: adminAuth.admin?.email || adminEmail,
              name: 'Administrator',
              role: 'admin',
              isMaster: true,
            } as User;
          } catch (adminErr) {
            // Can't get user
          }
        }
      } catch (e) {
        // Continue
      }
    }

    const body = await request.json();
    const { reservationId, status } = body;

    if (!reservationId || !status) {
      return NextResponse.json(
        { error: 'reservationId and status are required' },
        { status: 400 }
      );
    }

    // Get reservation to check tenant access
    const reservation = await pb.collection('reservation').getOne(reservationId, {
      expand: 'tenantId',
    });

    // Check permission based on action
    const requiredPermission = status === 'canceled' ? 'reservations.delete' : 'reservations.edit';
    if (user && !hasPermission(user, requiredPermission)) {
      return NextResponse.json(
        { error: 'You do not have permission to update reservations' },
        { status: 403 }
      );
    }

    // Check tenant access (unless master user)
    if (user && !isMasterUser(user)) {
      const resTenantId = Array.isArray(reservation.tenantId) 
        ? reservation.tenantId[0] 
        : reservation.tenantId;
      
      if (!hasTenantAccess(user, resTenantId)) {
        return NextResponse.json(
          { error: 'You do not have access to this reservation' },
          { status: 403 }
        );
      }
    }

    // Validate status transition
    const validStatuses = ['pending', 'confirmed', 'seated', 'completed', 'canceled', 'no_show'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    await pb.collection('reservation').update(reservationId, { status });

    return NextResponse.json({ 
      success: true,
      reservation: {
        id: reservationId,
        status,
      },
    });
  } catch (error: any) {
    console.error('Error updating reservation:', error);
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update reservation' },
      { status: 500 }
    );
  }
}


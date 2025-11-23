'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoutButton from './LogoutButton';
import { isMasterUser, type User } from '../lib/user-utils';

interface Tenant {
  id: string;
  name: string;
  key: string;
}

export default function Navbar() {
  const router = useRouter();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showTenantSelector, setShowTenantSelector] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [userTenants, setUserTenants] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch user role first, then fetch tenant info
    fetchUserRole();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTenantSelector && !(event.target as Element).closest('.relative')) {
        setShowTenantSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTenantSelector]);

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (response.ok && data.user) {
        const role = data.user.role || 'staff';
        const userTenantIds = data.user.tenants || [];
        const isMaster = data.user.isMaster === true || role === 'admin';
        
        console.log('Navbar: User data received', {
          id: data.user.id,
          email: data.user.email,
          role,
          isMaster: data.user.isMaster,
          isMasterUser: isMaster,
          tenants: userTenantIds
        });
        
        setUserRole(role);
        setUserTenants(userTenantIds);
        setUser(data.user);

        // Fetch tenants after we know user's access
        // Master users should see all tenants
        await fetchTenants(role, userTenantIds, isMaster);
        
        // Fetch current tenant after we have tenant list
        await fetchCurrentTenant();
      } else {
        console.error('Failed to fetch user:', data.error);
        // If token is invalid, redirect to login
        if (response.status === 401) {
          // Clear any stale tokens
          document.cookie = 'pb_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  const fetchCurrentTenant = async () => {
    try {
      // Get tenant ID from cookie
      const cookies = document.cookie.split(';');
      const tenantCookie = cookies.find(c => c.trim().startsWith('selected_tenant_id='));
      if (tenantCookie) {
        const tenantId = tenantCookie.split('=')[1];
        const response = await fetch('/api/tenants');
        const data = await response.json();
        if (response.ok && data.tenants) {
          const tenant = data.tenants.find((t: Tenant) => t.id === tenantId);
          if (tenant) {
            setCurrentTenant(tenant);
          } else {
            // If current tenant not found in available tenants, clear it
            // This can happen if tenant was deleted or user lost access
            setCurrentTenant(null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching current tenant:', err);
    }
  };

  const fetchTenants = async (role: string, userTenantIds: string[], isMaster?: boolean) => {
    try {
      const response = await fetch('/api/tenants');
      const data = await response.json();
      if (response.ok) {
        let filteredTenants = data.tenants || [];

        console.log('Navbar - Fetched tenants:', {
          count: filteredTenants.length,
          isMaster,
          role,
          userTenantIds,
          tenantIds: filteredTenants.map((t: Tenant) => ({ id: t.id, name: t.name })),
        });

        // Master users (isMaster=true OR role='admin') should see all tenants
        // Only filter for non-master users
        if (!isMaster && role !== 'admin') {
          if (userTenantIds.length > 0) {
          filteredTenants = filteredTenants.filter((t: Tenant) =>
            userTenantIds.includes(t.id)
          );
            console.log('Navbar - Filtered tenants for non-master user:', {
              originalCount: data.tenants?.length || 0,
              filteredCount: filteredTenants.length
            });
          } else {
            // Non-master user with no tenants assigned
            filteredTenants = [];
            console.log('Navbar - Non-master user has no tenants assigned');
          }
        } else {
          console.log('Navbar - Master user, showing all tenants');
        }

        setTenants(filteredTenants);
      } else {
        console.error('Failed to fetch tenants:', data.error);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    try {
      const isMaster = isMasterUser(user) || userRole === 'admin';
      console.log('Switching to tenant:', {
        tenantId,
        isMaster,
        userRole,
        userIsMaster: user?.isMaster,
        availableTenants: tenants.map(t => ({ id: t.id, name: t.name }))
      });
      
      const response = await fetch('/api/auth/select-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      const data = await response.json();

      console.log('Switch tenant response:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (response.ok) {
        setShowTenantSelector(false);
        // Update current tenant immediately
        const selectedTenant = tenants.find(t => t.id === tenantId);
        if (selectedTenant) {
          setCurrentTenant(selectedTenant);
        }
        // Reload to refresh all data
        window.location.reload();
      } else {
        console.error('Failed to switch tenant:', {
          status: response.status,
          error: data.error,
          tenantId,
          message: data.message,
          isMaster,
          userRole
        });
        alert(`Failed to switch tenant: ${data.error || data.message || 'Unknown error'}\n\nTenant ID: ${tenantId}\nStatus: ${response.status}`);
      }
    } catch (err: any) {
      console.error('Error switching tenant:', err);
      alert(`Failed to switch tenant: ${err.message || 'Please try again.'}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-accent-blue to-accent-purple shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-6 items-center">
            <Link href="/dashboard" className="text-white hover:text-accent-yellow font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20">
              Dashboard
            </Link>
            <Link href="/menu" className="text-white hover:text-accent-yellow font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20">
              Menu
            </Link>
            <Link href="/orders" className="text-white hover:text-accent-yellow font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20">
              Orders
            </Link>
            <Link href="/kds" className="text-white hover:text-accent-yellow font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20">
              KDS
            </Link>
            <Link href="/reservations" className="text-white hover:text-accent-yellow font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20">
              Reservations
            </Link>
            <Link href="/floorplan" className="text-white hover:text-accent-yellow font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20">
              Floor Plan
            </Link>
            <Link href="/locations" className="text-white hover:text-accent-yellow font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20">
              Locations
            </Link>
            <Link href="/coupons" className="text-white hover:text-accent-yellow font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20">
              Coupons
            </Link>
            <Link href="/users" className="text-white hover:text-accent-yellow font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20">
              Users
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {/* Show tenant selector based on user role and tenant availability */}
            {(() => {
              // Check if user is master - use both user object and userRole as fallback
              const isMaster = isMasterUser(user) || userRole === 'admin';
              
              // For master users: always show selector (even if tenants are still loading)
              if (isMaster) {
                return (
                  <div className="relative">
                    <button
                      onClick={() => setShowTenantSelector(!showTenantSelector)}
                      className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 font-medium text-sm backdrop-blur-sm transition-all duration-200"
                    >
                      {currentTenant 
                        ? `${currentTenant.name} ▼` 
                        : tenants.length > 0 
                          ? `Select Restaurant (${tenants.length}) ▼` 
                          : 'Select Restaurant ▼'}
                    </button>
                    {showTenantSelector && tenants.length > 0 && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                        <div className="py-2">
                          {tenants.map((tenant) => (
                            <button
                              key={tenant.id}
                              onClick={() => handleSwitchTenant(tenant.id)}
                              className={`w-full text-left px-4 py-2 hover:bg-accent-purple/20 transition-colors duration-200 ${tenant.id === currentTenant?.id ? 'bg-accent-blue/20 text-accent-blue font-medium' : 'text-gray-700'
                                }`}
                            >
                              {tenant.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {showTenantSelector && tenants.length === 0 && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="py-2 px-4 text-sm text-gray-500">
                          Loading restaurants...
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              
              // For non-master users: show selector only if they have multiple tenants
              if (!isMaster && tenants.length > 1 && currentTenant) {
                return (
                  <div className="relative">
                    <button
                      onClick={() => setShowTenantSelector(!showTenantSelector)}
                      className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 font-medium text-sm backdrop-blur-sm transition-all duration-200"
                    >
                      {currentTenant.name} ▼
                    </button>
                    {showTenantSelector && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                        <div className="py-2">
                          {tenants.map((tenant) => (
                            <button
                              key={tenant.id}
                              onClick={() => handleSwitchTenant(tenant.id)}
                              className={`w-full text-left px-4 py-2 hover:bg-accent-purple/20 transition-colors duration-200 ${tenant.id === currentTenant?.id ? 'bg-accent-blue/20 text-accent-blue font-medium' : 'text-gray-700'
                                }`}
                            >
                              {tenant.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              
              // Show static badge if user has only one tenant
              if (currentTenant) {
                return (
                  <div className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium text-sm backdrop-blur-sm">
                    {currentTenant.name}
                  </div>
                );
              }
              
              return null;
            })()}
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}


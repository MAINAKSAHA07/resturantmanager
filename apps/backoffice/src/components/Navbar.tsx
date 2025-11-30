'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';
import { isMasterUser, type User } from '../lib/user-utils';

interface Tenant {
  id: string;
  name: string;
  key: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showTenantSelector, setShowTenantSelector] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [userTenants, setUserTenants] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);

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
        // Only users with isMaster === true are master users
        // Admins are assigned to specific tenants and are not master users
        const isMaster = data.user.isMaster === true;
        
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
        setUserLoaded(true);

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

        // Master users (isMaster=true) should see all tenants
        // Admins and other users only see their assigned tenants
        if (!isMaster) {
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
      const isMaster = isMasterUser(user);
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

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Mobile Menu Button - Fixed Top */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gradient-to-r from-accent-blue to-accent-purple text-white p-3 rounded-lg shadow-lg hover:bg-opacity-90 transition-all duration-200"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-accent-blue to-accent-purple shadow-xl z-40 transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Restaurant</h1>
                <p className="text-white/80 text-xs">Manager</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              <Link 
                href="/dashboard" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/dashboard')
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Dashboard</span>
              </Link>

              <Link 
                href="/menu" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/menu')
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Menu</span>
              </Link>

              <Link 
                href="/orders" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/orders')
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Orders</span>
              </Link>

              <Link 
                href="/kds" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/kds')
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span>KDS</span>
              </Link>

              <Link 
                href="/reservations" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/reservations')
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Reservations</span>
              </Link>

              <Link 
                href="/floorplan" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/floorplan')
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                </svg>
                <span>Floor Plan</span>
              </Link>

              <Link 
                href="/locations" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/locations')
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Locations</span>
              </Link>

              <Link 
                href="/coupons" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/coupons')
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Coupons</span>
              </Link>

              <Link 
                href="/users" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/users')
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Users</span>
              </Link>

              {userLoaded && user && user.isMaster === true && (
                <Link 
                  href="/tenants" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/tenants')
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Tenants</span>
                </Link>
              )}
            </div>
          </nav>

          {/* Bottom Section - Tenant Selector & Logout */}
          <div className="p-4 border-t border-white/20 space-y-3">
            {/* Tenant Selector */}
            {(() => {
              const isMaster = isMasterUser(user);
              
              if (isMaster) {
                return (
                  <div className="relative">
                    <button
                      onClick={() => setShowTenantSelector(!showTenantSelector)}
                      className="w-full px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 font-medium text-sm backdrop-blur-sm transition-all duration-200 text-left flex items-center justify-between"
                    >
                      <span className="truncate">
                        {currentTenant ? currentTenant.name : tenants.length > 0 ? `Select Restaurant (${tenants.length})` : 'Select Restaurant'}
                      </span>
                      <span>▼</span>
                    </button>
                    {showTenantSelector && tenants.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-48 overflow-y-auto">
                        <div className="py-2">
                          {tenants.map((tenant) => (
                            <button
                              key={tenant.id}
                              onClick={() => handleSwitchTenant(tenant.id)}
                              className={`w-full text-left px-4 py-2 hover:bg-accent-purple/20 transition-colors duration-200 ${
                                tenant.id === currentTenant?.id ? 'bg-accent-blue/20 text-accent-blue font-medium' : 'text-gray-700'
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
              
              if (!isMaster && tenants.length > 1 && currentTenant) {
                return (
                  <div className="relative">
                    <button
                      onClick={() => setShowTenantSelector(!showTenantSelector)}
                      className="w-full px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 font-medium text-sm backdrop-blur-sm transition-all duration-200 text-left flex items-center justify-between"
                    >
                      <span className="truncate">{currentTenant.name}</span>
                      <span>▼</span>
                    </button>
                    {showTenantSelector && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-48 overflow-y-auto">
                        <div className="py-2">
                          {tenants.map((tenant) => (
                            <button
                              key={tenant.id}
                              onClick={() => handleSwitchTenant(tenant.id)}
                              className={`w-full text-left px-4 py-2 hover:bg-accent-purple/20 transition-colors duration-200 ${
                                tenant.id === currentTenant?.id ? 'bg-accent-blue/20 text-accent-blue font-medium' : 'text-gray-700'
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
              
              if (currentTenant) {
                return (
                  <div className="w-full px-4 py-2 bg-white/20 text-white rounded-lg font-medium text-sm backdrop-blur-sm truncate">
                    {currentTenant.name}
                  </div>
                );
              }
              
              return null;
            })()}

            {/* Logout Button */}
            <div className="w-full">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

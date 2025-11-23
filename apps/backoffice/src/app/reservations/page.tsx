'use client';

import { useEffect, useState } from 'react';

interface Reservation {
  id: string;
  partySize: number;
  startTime: string;
  status: string;
  notes: string;
  created: string;
  expand?: {
    customerId?: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
    tenantId?: {
      id: string;
      name: string;
    };
    locationId?: {
      id: string;
      name: string;
    };
  };
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tenantName?: string;
  locationName?: string;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reservations, statusFilter, dateFilter, searchQuery]);

  const fetchReservations = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);
      
      const url = `/api/reservations${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Process reservations to extract customer info
      const processedReservations = (data.reservations || []).map((res: any) => {
        const customer = res.expand?.customerId;
        const tenant = res.expand?.tenantId;
        const location = res.expand?.locationId;
        return {
          ...res,
          customerName: customer?.name || 'Guest',
          customerEmail: customer?.email || '-',
          customerPhone: customer?.phone || '-',
          tenantName: tenant?.name || '-',
          locationName: location?.name || '-',
        };
      });
      
      setReservations(processedReservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reservations];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((res) => {
        return (
          res.customerName?.toLowerCase().includes(query) ||
          res.customerEmail?.toLowerCase().includes(query) ||
          res.customerPhone?.toLowerCase().includes(query) ||
          res.notes?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredReservations(filtered);
  };

  const updateReservationStatus = async (id: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: id, status: newStatus }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        fetchReservations();
      } else {
        throw new Error(data.error || 'Failed to update reservation');
      }
    } catch (error: any) {
      console.error('Error updating reservation:', error);
      alert(`Failed to update reservation: ${error.message || 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      seated: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      canceled: 'bg-red-100 text-red-800',
      no_show: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 via-accent-purple/5 to-accent-green/5 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Reservations</h1>
          <div className="text-sm text-gray-600">
            Total: {filteredReservations.length} reservation{filteredReservations.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  fetchReservations();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="seated">Seated</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  fetchReservations();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setDateFilter('');
                  setSearchQuery('');
                  fetchReservations();
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Reservations Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Loading reservations...</div>
          ) : filteredReservations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No reservations found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Party Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{reservation.customerName || 'Guest'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-gray-900">{reservation.customerEmail || '-'}</div>
                        <div className="text-gray-500">{reservation.customerPhone || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div>{new Date(reservation.startTime).toLocaleDateString()}</div>
                        <div className="text-gray-500">{new Date(reservation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                          {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {reservation.notes || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          {reservation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'canceled')}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {reservation.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'seated')}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Seat
                              </button>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'canceled')}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {reservation.status === 'seated' && (
                            <>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'completed')}
                                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'no_show')}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                No Show
                              </button>
                            </>
                          )}
                          {(reservation.status === 'completed' || reservation.status === 'canceled' || reservation.status === 'no_show') && (
                            <span className="text-xs text-gray-500">No actions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




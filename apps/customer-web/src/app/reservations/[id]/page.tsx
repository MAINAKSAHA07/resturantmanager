'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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
}

export default function ReservationDetailPage() {
  const params = useParams();
  const reservationId = params.id as string;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reservationRef = useRef<Reservation | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    reservationRef.current = reservation;
  }, [reservation]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchReservation = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }
      
      try {
        // Add cache-busting to ensure we get fresh data
        const response = await fetch(`/api/reservations/${reservationId}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setReservation(data.reservation);
            setError(null);
          }
        } else {
          const errorData = await response.json();
          if (isMounted) {
            setError(errorData.error || 'Failed to load reservation');
          }
        }
      } catch (error: any) {
        console.error('Error fetching reservation:', error);
        if (isMounted) {
          setError('Failed to load reservation');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (reservationId) {
      // Initial fetch
      fetchReservation(true);
      
      // Auto-refresh every 5 seconds to get status updates
      // Stop auto-refresh if status is final (completed, canceled, no_show)
      const interval = setInterval(() => {
        // Check current reservation status from ref
        const currentReservation = reservationRef.current;
        if (currentReservation && !['completed', 'canceled', 'no_show'].includes(currentReservation.status)) {
          fetchReservation(false);
        }
      }, 5000);
      
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [reservationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading reservation...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Reservation not found'}</p>
          <Link
            href="/reservations"
            className="text-blue-600 hover:underline"
          >
            Back to Reservations
          </Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    seated: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    canceled: 'bg-red-100 text-red-800',
    no_show: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-6">Reservation Confirmed</h1>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Reservation ID</p>
              <p className="font-mono text-sm">{reservation.id}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[reservation.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1).replace('_', ' ')}
              </span>
            </div>

            {reservation.expand?.customerId && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer</p>
                <p className="text-lg font-semibold">{reservation.expand.customerId.name}</p>
                <p className="text-sm text-gray-600">{reservation.expand.customerId.email}</p>
                <p className="text-sm text-gray-600">{reservation.expand.customerId.phone}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600 mb-1">Party Size</p>
              <p className="text-lg font-semibold">{reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Date & Time</p>
              <p className="text-lg font-semibold">
                {new Date(reservation.startTime).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {reservation.expand?.locationId && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Location</p>
                <p className="text-lg font-semibold">{reservation.expand.locationId.name}</p>
              </div>
            )}

            {reservation.notes && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Special Requests</p>
                <p className="text-gray-800">{reservation.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                {reservation.status === 'pending' && "Your reservation is pending. You'll receive a confirmation once it's been reviewed by our team."}
                {reservation.status === 'confirmed' && "Your reservation has been confirmed! We look forward to seeing you."}
                {reservation.status === 'seated' && "You have been seated. Enjoy your meal!"}
                {reservation.status === 'completed' && "Thank you for dining with us!"}
                {reservation.status === 'canceled' && "This reservation has been canceled."}
                {reservation.status === 'no_show' && "This reservation was marked as no-show."}
                {!['pending', 'confirmed', 'seated', 'completed', 'canceled', 'no_show'].includes(reservation.status) && 
                  `Your reservation is ${reservation.status}.`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const response = await fetch(`/api/reservations/${reservationId}?t=${Date.now()}`, { 
                  cache: 'no-store' 
                });
                const data = await response.json();
                if (response.ok) {
                  setReservation(data.reservation);
                }
              } catch (err) {
                console.error('Error refreshing:', err);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Status'}
          </button>
        </div>

        <div className="flex gap-4">
          <Link
            href="/"
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-center"
          >
            Back to Menu
          </Link>
          <Link
            href="/reservations"
            className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 text-center"
          >
            Make Another Reservation
          </Link>
        </div>
      </div>
    </div>
  );
}


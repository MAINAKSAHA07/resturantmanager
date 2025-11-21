'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  todayOrders: number;
  totalRevenue: number;
  completedOrders: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d'>('1d');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/stats?range=${timeRange}`);
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      } else {
        console.error('Error fetching stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>

          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg shadow-sm p-1 flex">
              <button
                onClick={() => setTimeRange('1d')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${timeRange === '1d'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${timeRange === '7d'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${timeRange === '30d'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                30 Days
              </button>
            </div>

            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">
              {timeRange === '1d' ? "Today's Orders" :
                timeRange === '7d' ? "Last 7 Days Orders" : "Last 30 Days Orders"}
            </h2>
            <p className="text-3xl font-bold">{stats.todayOrders}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Total Revenue</h2>
            <p className="text-3xl font-bold">₹{(stats.totalRevenue / 100).toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Completed</h2>
            <p className="text-3xl font-bold">{stats.completedOrders}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/menu"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-center"
            >
              Manage Menu
            </Link>
            <Link
              href="/orders"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-center"
            >
              View Orders
            </Link>
            <Link
              href="/kds"
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 text-center"
            >
              Kitchen Display
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}




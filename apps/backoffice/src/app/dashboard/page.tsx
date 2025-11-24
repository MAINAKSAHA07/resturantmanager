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
  }, [timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 via-accent-purple/5 to-accent-green/5 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Dashboard</h1>

          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl shadow-md p-1 flex border border-accent-blue/20">
              <button
                onClick={() => setTimeRange('1d')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${timeRange === '1d'
                  ? 'bg-accent-blue text-white shadow-md'
                  : 'text-gray-600 hover:bg-accent-purple/10'
                  }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${timeRange === '7d'
                  ? 'bg-accent-blue text-white shadow-md'
                  : 'text-gray-600 hover:bg-accent-purple/10'
                  }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${timeRange === '30d'
                  ? 'bg-accent-blue text-white shadow-md'
                  : 'text-gray-600 hover:bg-accent-purple/10'
                  }`}
              >
                30 Days
              </button>
            </div>

            <button
              onClick={fetchStats}
              className="btn-primary text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="card-accent border-l-4 border-l-accent-blue">
            <h2 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">
              {timeRange === '1d' ? "Today's Orders" :
                timeRange === '7d' ? "Last 7 Days Orders" : "Last 30 Days Orders"}
            </h2>
            <p className="text-3xl sm:text-4xl font-bold text-accent-blue">{stats.todayOrders}</p>
          </div>

          <div className="card-accent border-l-4 border-l-accent-green">
            <h2 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">Total Revenue</h2>
            <p className="text-3xl sm:text-4xl font-bold text-accent-green">₹{(stats.totalRevenue / 100).toFixed(2)}</p>
          </div>

          <div className="card-accent border-l-4 border-l-accent-purple sm:col-span-2 lg:col-span-1">
            <h2 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">Completed</h2>
            <p className="text-3xl sm:text-4xl font-bold text-accent-purple">{stats.completedOrders}</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/menu"
              className="btn-primary text-center"
            >
              Manage Menu
            </Link>
            <Link
              href="/orders"
              className="btn-success text-center"
            >
              View Orders
            </Link>
            <Link
              href="/kds"
              className="btn-warning text-center"
            >
              Kitchen Display
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}




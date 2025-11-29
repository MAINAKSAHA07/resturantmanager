'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, KPIStat, Card, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@restaurant/ui';
import { DashboardCharts, DailySalesData, OrdersByStatusData } from '@/components/DashboardCharts';

interface DashboardStats {
  todayOrders: number;
  totalRevenue: number;
  completedOrders: number;
  dailySales?: DailySalesData[];
  ordersByStatus?: OrdersByStatusData[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    dailySales: [],
    ordersByStatus: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d'>('30d'); // Default to 30d for charts

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
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-brand-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const timeRangeLabels = {
    '1d': "Today's Orders",
    '7d': 'Last 7 Days Orders',
    '30d': 'Last 30 Days Orders',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-accent-50/30 to-brand-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <PageHeader
          title="Dashboard"
          subtitle="Monitor your restaurant's performance at a glance"
          actions={
            <div className="flex items-center gap-3">
              <Tabs value={timeRange} onChange={(value) => setTimeRange(value as '1d' | '7d' | '30d')}>
                <TabsList className="bg-white border border-brand-200 shadow-sm">
                  <TabsTrigger value="1d">Today</TabsTrigger>
                  <TabsTrigger value="7d">7 Days</TabsTrigger>
                  <TabsTrigger value="30d">30 Days</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button onClick={fetchStats} size="sm" variant="secondary">
                Refresh
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <KPIStat
            label={timeRangeLabels[timeRange]}
            value={stats.todayOrders}
            accentColor="blue"
            icon={
              <svg className="h-8 w-8 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <KPIStat
            label="Total Revenue"
            value={`₹${(stats.totalRevenue / 100).toFixed(2)}`}
            accentColor="green"
            icon={
              <svg className="h-8 w-8 text-status-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KPIStat
            label="Completed Orders"
            value={stats.completedOrders}
            accentColor="purple"
            icon={
              <svg className="h-8 w-8 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Charts Section */}
        {(stats.dailySales && stats.dailySales.length > 0) ||
        (stats.ordersByStatus && stats.ordersByStatus.length > 0) ? (
          <div className="mb-8">
            <DashboardCharts
              dailySales={stats.dailySales || []}
              ordersByStatus={stats.ordersByStatus || []}
            />
          </div>
        ) : null}

        <Card>
          <h2 className="text-2xl font-bold mb-6 text-brand-900">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/menu">
              <Button variant="primary" className="w-full">
                Manage Menu
              </Button>
            </Link>
            <Link href="/orders">
              <Button variant="success" className="w-full">
                View Orders
              </Button>
            </Link>
            <Link href="/kds">
              <Button variant="secondary" className="w-full">
                Kitchen Display
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}




import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, DollarSign, Clock, Users, Package, Wrench, BarChart3 } from 'lucide-react';

interface AnalyticsData {
  workOrderStats: {
    total: number;
    completed: number;
    inProgress: number;
    avgCompletionTime: number;
  };
  revenueStats: {
    totalRevenue: number;
    avgJobValue: number;
    monthlyRevenue: number;
  };
  technicianStats: {
    totalTechnicians: number;
    avgJobsPerTech: number;
    topPerformer: string;
  };
  inventoryStats: {
    totalParts: number;
    lowStockItems: number;
    inventoryValue: number;
  };
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const now = new Date();
      let startDate = new Date();

      if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('*')
        .gte('created_at', startDate.toISOString());

      const { data: quotes } = await supabase
        .from('quotes')
        .select('*')
        .eq('status', 'approved')
        .gte('created_at', startDate.toISOString());

      const { data: parts } = await supabase
        .from('inventory_parts')
        .select('*');

      const { data: technicians } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'technician');

      const workOrderStats = {
        total: workOrders?.length || 0,
        completed: workOrders?.filter(wo => wo.status === 'completed').length || 0,
        inProgress: workOrders?.filter(wo => wo.status === 'in_progress').length || 0,
        avgCompletionTime: 0,
      };

      const totalRevenue = quotes?.reduce((sum, q) => sum + q.total_amount, 0) || 0;
      const revenueStats = {
        totalRevenue,
        avgJobValue: workOrderStats.total > 0 ? totalRevenue / workOrderStats.total : 0,
        monthlyRevenue: totalRevenue,
      };

      const technicianStats = {
        totalTechnicians: technicians?.length || 0,
        avgJobsPerTech: technicians?.length ? workOrderStats.total / technicians.length : 0,
        topPerformer: 'N/A',
      };

      const inventoryStats = {
        totalParts: parts?.length || 0,
        lowStockItems: parts?.filter(p => p.quantity_in_stock <= p.minimum_stock_level).length || 0,
        inventoryValue: parts?.reduce((sum, p) => sum + (p.quantity_in_stock * p.unit_price), 0) || 0,
      };

      setAnalytics({
        workOrderStats,
        revenueStats,
        technicianStats,
        inventoryStats,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Analytics Dashboard</h1>
          <p className="text-slate-600">Business performance metrics and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Wrench className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Total Work Orders</p>
          <p className="text-3xl font-bold text-slate-900">{analytics?.workOrderStats.total}</p>
          <p className="text-xs text-green-600 mt-2">
            {analytics?.workOrderStats.completed} completed
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-slate-900">
            ${analytics?.revenueStats.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Avg: ${analytics?.revenueStats.avgJobValue.toFixed(0)} per job
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Active Technicians</p>
          <p className="text-3xl font-bold text-slate-900">{analytics?.technicianStats.totalTechnicians}</p>
          <p className="text-xs text-slate-600 mt-2">
            {analytics?.technicianStats.avgJobsPerTech.toFixed(1)} jobs per tech
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Inventory Value</p>
          <p className="text-3xl font-bold text-slate-900">
            ${analytics?.inventoryStats.inventoryValue.toLocaleString()}
          </p>
          <p className="text-xs text-amber-600 mt-2">
            {analytics?.inventoryStats.lowStockItems} low stock items
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Work Order Status</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Completed</span>
                <span className="text-sm font-medium text-slate-900">
                  {analytics?.workOrderStats.completed}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${
                      analytics?.workOrderStats.total
                        ? (analytics.workOrderStats.completed / analytics.workOrderStats.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">In Progress</span>
                <span className="text-sm font-medium text-slate-900">
                  {analytics?.workOrderStats.inProgress}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${
                      analytics?.workOrderStats.total
                        ? (analytics.workOrderStats.inProgress / analytics.workOrderStats.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Pending</span>
                <span className="text-sm font-medium text-slate-900">
                  {analytics?.workOrderStats.total -
                    analytics?.workOrderStats.completed -
                    analytics?.workOrderStats.inProgress}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-amber-600 h-2 rounded-full"
                  style={{
                    width: `${
                      analytics?.workOrderStats.total
                        ? ((analytics.workOrderStats.total -
                            analytics.workOrderStats.completed -
                            analytics.workOrderStats.inProgress) /
                            analytics.workOrderStats.total) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Performance Metrics</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Avg Completion Time</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {analytics?.workOrderStats.avgCompletionTime || 0} days
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Monthly Revenue</p>
                  <p className="text-lg font-semibold text-slate-900">
                    ${analytics?.revenueStats.monthlyRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Top Performer</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {analytics?.technicianStats.topPerformer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Key Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">Completion Rate</p>
            <p className="text-2xl font-bold text-blue-700">
              {analytics?.workOrderStats.total
                ? ((analytics.workOrderStats.completed / analytics.workOrderStats.total) * 100).toFixed(1)
                : 0}
              %
            </p>
            <p className="text-xs text-blue-600 mt-1">Work orders completed successfully</p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-1">Average Job Value</p>
            <p className="text-2xl font-bold text-green-700">
              ${analytics?.revenueStats.avgJobValue.toFixed(0)}
            </p>
            <p className="text-xs text-green-600 mt-1">Per completed work order</p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-900 mb-1">Technician Utilization</p>
            <p className="text-2xl font-bold text-amber-700">
              {analytics?.technicianStats.avgJobsPerTech.toFixed(1)}
            </p>
            <p className="text-xs text-amber-600 mt-1">Jobs per technician</p>
          </div>
        </div>
      </div>
    </div>
  );
}

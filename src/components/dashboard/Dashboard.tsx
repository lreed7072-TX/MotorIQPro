import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { WorkOrder } from '../../types/database';
import { Clock, AlertCircle, CheckCircle, Plus, Search, TrendingUp, FileCheck } from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';
import AdminSettings from '../admin/AdminSettings';
import WorkOrdersList from '../work-orders/WorkOrdersList';
import EquipmentDatabase from '../equipment/EquipmentDatabase';
import ReportsList from '../reports/ReportsList';
import CreateWorkOrder from '../work-orders/CreateWorkOrder';
import WorkOrderDetail from '../work-orders/WorkOrderDetail';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { profile } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'work-orders' | 'equipment' | 'reports' | 'settings'>('dashboard');

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      setCurrentView(page as any);
    }
  };
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    completed: 0,
    pendingApproval: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const canCreateWorkOrder = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    fetchWorkOrders();
  }, [profile]);

  const fetchWorkOrders = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const query = supabase
        .from('work_orders')
        .select(`
          *,
          equipment_unit:equipment_units (
            *,
            equipment_model:equipment_models (
              *,
              manufacturer:manufacturers (name)
            )
          ),
          customer:customers (company_name),
          work_sessions (
            id,
            progress_percentage,
            status
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (profile.role === 'technician') {
        query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setWorkOrders(data || []);

      const active = data?.filter(wo => wo.status === 'in_progress').length || 0;
      const pending = data?.filter(wo => wo.status === 'pending').length || 0;
      const completed = data?.filter(wo => wo.status === 'completed').length || 0;
      const pendingApproval = data?.filter(wo => wo.approval_status === 'pending').length || 0;

      setStats({ active, pending, completed, pendingApproval });
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-amber-100 text-amber-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      on_hold: 'bg-slate-100 text-slate-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: 'bg-slate-100 text-slate-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-amber-100 text-amber-700',
      emergency: 'bg-red-100 text-red-700',
    };
    return badges[priority as keyof typeof badges] || badges.medium;
  };

  const [showCreateWorkOrder, setShowCreateWorkOrder] = useState(false);

  if (currentView === 'settings') {
    return (
      <DashboardLayout currentPage="settings" onNavigate={handleNavigate}>
        <AdminSettings />
      </DashboardLayout>
    );
  }

  if (currentView === 'work-orders') {
    return (
      <DashboardLayout currentPage="work-orders" onNavigate={handleNavigate}>
        <WorkOrdersList />
      </DashboardLayout>
    );
  }

  if (currentView === 'equipment') {
    return (
      <DashboardLayout currentPage="equipment" onNavigate={handleNavigate}>
        <EquipmentDatabase />
      </DashboardLayout>
    );
  }

  if (currentView === 'reports') {
    return (
      <DashboardLayout currentPage="reports" onNavigate={handleNavigate}>
        <ReportsList />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="dashboard" onNavigate={handleNavigate}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Welcome back, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-slate-600">Here's what's happening with your work orders today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => setFilterStatus(filterStatus === 'in_progress' ? null : 'in_progress')}
            className={`bg-white rounded-lg border p-6 text-left transition hover:shadow-md ${
              filterStatus === 'in_progress' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{stats.active}</p>
            <p className="text-sm text-slate-600">Active Work Orders</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'pending' ? null : 'pending')}
            className={`bg-white rounded-lg border p-6 text-left transition hover:shadow-md ${
              filterStatus === 'pending' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-amber-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{stats.pending}</p>
            <p className="text-sm text-slate-600">Pending Assignment</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'pending_approval' ? null : 'pending_approval')}
            className={`bg-white rounded-lg border p-6 text-left transition hover:shadow-md ${
              filterStatus === 'pending_approval' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <FileCheck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{stats.pendingApproval}</p>
            <p className="text-sm text-slate-600">Pending Approval</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'completed' ? null : 'completed')}
            className={`bg-white rounded-lg border p-6 text-left transition hover:shadow-md ${
              filterStatus === 'completed' ? 'border-green-500 ring-2 ring-green-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{stats.completed}</p>
            <p className="text-sm text-slate-600">Completed Recently</p>
          </button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent Work Orders</h2>
              {canCreateWorkOrder && (
                <button
                  onClick={() => setShowCreateWorkOrder(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Work Order</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading work orders...</p>
            </div>
          ) : workOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 mb-2">No work orders found</p>
              <p className="text-sm text-slate-500">Create a new work order to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {workOrders
                .filter((wo) => {
                  if (!filterStatus) return true;
                  if (filterStatus === 'pending_approval') {
                    return wo.approval_status === 'pending';
                  }
                  return wo.status === filterStatus;
                })
                .map((wo) => (
                <div
                  key={wo.id}
                  onClick={() => setSelectedWorkOrderId(wo.id)}
                  className="p-6 hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{wo.work_order_number}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                            wo.status
                          )}`}
                        >
                          {wo.status.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadge(
                            wo.priority
                          )}`}
                        >
                          {wo.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {wo.equipment_unit?.equipment_model?.manufacturer?.name}{' '}
                        {wo.equipment_unit?.equipment_model?.model_number}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Customer:</span>{' '}
                      {wo.customer?.company_name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Serial:</span>{' '}
                      {wo.equipment_unit?.serial_number || 'N/A'}
                    </div>
                    {wo.work_sessions?.[0] && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>{Math.round(wo.work_sessions[0].progress_percentage)}% complete</span>
                      </div>
                    )}
                  </div>

                  {wo.reported_issue && (
                    <p className="mt-3 text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                      <span className="font-medium">Issue:</span> {wo.reported_issue}
                    </p>
                  )}

                  {wo.status === 'in_progress' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWorkOrderId(wo.id);
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Continue Work →
                    </button>
                  )}
                  {wo.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWorkOrderId(wo.id);
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Start Work →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateWorkOrder && (
        <CreateWorkOrder
          onClose={() => setShowCreateWorkOrder(false)}
          onSuccess={() => {
            fetchWorkOrders();
          }}
        />
      )}

      {selectedWorkOrderId && (
        <WorkOrderDetail
          workOrderId={selectedWorkOrderId}
          onClose={() => setSelectedWorkOrderId(null)}
          onUpdate={() => {
            fetchWorkOrders();
          }}
        />
      )}
    </DashboardLayout>
  );
}

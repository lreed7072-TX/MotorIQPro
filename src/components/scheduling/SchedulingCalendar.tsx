import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, User, Filter, Search } from 'lucide-react';

interface WorkOrder {
  id: string;
  work_order_number: string;
  scheduled_date: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  customer: {
    company_name: string;
    address: any;
  };
  equipment_unit: {
    serial_number: string;
  };
}

interface Technician {
  id: string;
  full_name: string;
  role: string;
}

export default function SchedulingCalendar() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [draggedOrder, setDraggedOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedDate, viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: techData } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('role', 'technician');

      const startDate = getStartDate();
      const endDate = getEndDate();

      const { data: woData } = await supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          scheduled_date,
          assigned_to,
          status,
          priority,
          customer:customers(company_name, address),
          equipment_unit:equipment_units(serial_number)
        `)
        .or(`and(scheduled_date.gte.${startDate},scheduled_date.lte.${endDate}),assigned_to.is.null`);

      setTechnicians(techData || []);
      setWorkOrders(woData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const date = new Date(selectedDate);
    if (viewMode === 'day') {
      return date.toISOString().split('T')[0];
    } else if (viewMode === 'week') {
      const day = date.getDay();
      const diff = date.getDate() - day;
      return new Date(date.setDate(diff)).toISOString().split('T')[0];
    } else {
      return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    }
  };

  const getEndDate = () => {
    const date = new Date(selectedDate);
    if (viewMode === 'day') {
      return date.toISOString().split('T')[0];
    } else if (viewMode === 'week') {
      const day = date.getDay();
      const diff = date.getDate() - day + 6;
      return new Date(date.setDate(diff)).toISOString().split('T')[0];
    } else {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    }
  };

  const handleDragStart = (orderId: string) => {
    setDraggedOrder(orderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (technicianId: string, date: string) => {
    if (!draggedOrder) return;

    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          assigned_to: technicianId,
          scheduled_date: date,
          status: 'assigned'
        })
        .eq('id', draggedOrder);

      if (!error) {
        await loadData();
      }
    } catch (error) {
      console.error('Error updating work order:', error);
    } finally {
      setDraggedOrder(null);
    }
  };

  const getDatesInRange = () => {
    const dates: Date[] = [];
    const start = new Date(getStartDate());
    const end = new Date(getEndDate());

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    return dates;
  };

  const getWorkOrdersForTechAndDate = (techId: string, date: string) => {
    return workOrders.filter(
      wo => wo.assigned_to === techId &&
           wo.scheduled_date === date &&
           (filterStatus === 'all' || wo.status === filterStatus)
    );
  };

  const getUnassignedOrders = () => {
    return workOrders.filter(wo =>
      !wo.assigned_to &&
      wo.status !== 'completed' &&
      wo.status !== 'cancelled'
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100 border-red-500 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      default: return 'bg-blue-100 border-blue-500 text-blue-800';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    if (viewMode === 'day') {
      date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scheduling & Dispatch</h1>
          <p className="text-slate-600">Drag and drop work orders to assign and schedule</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
          </select>

          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <button
          onClick={() => navigateDate('prev')}
          className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          Previous
        </button>

        <div className="text-lg font-semibold">
          {selectedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: viewMode === 'day' ? 'numeric' : undefined
          })}
        </div>

        <button
          onClick={() => navigateDate('next')}
          className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-2 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Unassigned Orders
          </h3>
          <div className="space-y-2">
            {getUnassignedOrders().map(order => (
              <div
                key={order.id}
                draggable
                onDragStart={() => handleDragStart(order.id)}
                className={`p-3 border-l-4 rounded cursor-move ${getPriorityColor(order.priority)}`}
              >
                <div className="text-sm font-medium">{order.work_order_number}</div>
                <div className="text-xs mt-1">{order.customer?.company_name}</div>
                <div className="text-xs text-slate-600">{order.priority} priority</div>
              </div>
            ))}
            {getUnassignedOrders().length === 0 && (
              <p className="text-sm text-slate-500">No unassigned orders</p>
            )}
          </div>
        </div>

        <div className="col-span-10 bg-white rounded-lg shadow overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-50">
                  Technician
                </th>
                {getDatesInRange().map((date, idx) => (
                  <th key={idx} className="p-3 text-center font-semibold text-slate-700 min-w-[200px]">
                    <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-sm font-normal">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech) => (
                <tr key={tech.id} className="border-b border-slate-100">
                  <td className="p-3 sticky left-0 bg-white border-r border-slate-200">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-800">{tech.full_name}</span>
                    </div>
                  </td>
                  {getDatesInRange().map((date, idx) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const orders = getWorkOrdersForTechAndDate(tech.id, dateStr);

                    return (
                      <td
                        key={idx}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(tech.id, dateStr)}
                        className="p-2 align-top bg-slate-50 hover:bg-slate-100"
                      >
                        <div className="space-y-2 min-h-[80px]">
                          {orders.map(order => (
                            <div
                              key={order.id}
                              draggable
                              onDragStart={() => handleDragStart(order.id)}
                              className={`p-2 border-l-4 rounded cursor-move text-sm ${getPriorityColor(order.priority)}`}
                            >
                              <div className="font-medium">{order.work_order_number}</div>
                              <div className="text-xs mt-1">{order.customer?.company_name}</div>
                              <div className="flex items-center gap-1 text-xs mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{order.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Legend</h3>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Emergency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm">High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Medium Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">Low Priority</span>
          </div>
        </div>
      </div>
    </div>
  );
}
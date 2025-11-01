import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Report } from '../../types/database';
import { Search, Filter, Download, FileText, Eye, CheckCircle } from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';

export default function ReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('reports')
        .select(`
          *,
          work_order:work_orders (
            work_order_number,
            equipment_unit:equipment_units (
              serial_number,
              equipment_model:equipment_models (
                model_number,
                manufacturer:manufacturers (name)
              )
            ),
            customer:customers (company_name)
          ),
          generated_by_user:users!reports_generated_by_fkey (full_name)
        `)
        .order('generated_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      report.report_number.toLowerCase().includes(searchLower) ||
      report.work_order?.work_order_number?.toLowerCase().includes(searchLower) ||
      report.work_order?.customer?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-slate-100 text-slate-800',
      pending_approval: 'bg-amber-100 text-amber-800',
      approved: 'bg-green-100 text-green-800',
      sent: 'bg-blue-100 text-blue-800',
    };
    return badges[status as keyof typeof badges] || badges.draft;
  };

  const getReportTypeBadge = (type: string) => {
    const badges = {
      inspection: 'bg-blue-100 text-blue-700',
      repair: 'bg-green-100 text-green-700',
      rebuild: 'bg-purple-100 text-purple-700',
      test: 'bg-cyan-100 text-cyan-700',
    };
    return badges[type as keyof typeof badges] || badges.inspection;
  };

  return (
    <DashboardLayout currentPage="reports">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Reports</h1>
          <p className="text-slate-600">View and manage inspection and repair reports</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by report number, work order, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="sent">Sent</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600">No reports found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredReports.map((report) => (
                <div key={report.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{report.report_number}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getReportTypeBadge(
                            report.report_type
                          )}`}
                        >
                          {report.report_type}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                            report.status
                          )}`}
                        >
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-slate-600">
                        <p>
                          <span className="font-medium">Work Order:</span>{' '}
                          {report.work_order?.work_order_number}
                        </p>
                        <p>
                          <span className="font-medium">Equipment:</span>{' '}
                          {report.work_order?.equipment_unit?.equipment_model?.manufacturer?.name}{' '}
                          {report.work_order?.equipment_unit?.equipment_model?.model_number}
                        </p>
                        <p>
                          <span className="font-medium">Customer:</span>{' '}
                          {report.work_order?.customer?.company_name || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-sm text-slate-600">
                      <p className="mb-1">
                        {new Date(report.generated_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs">
                        by {report.generated_by_user?.full_name || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>

                    {report.pdf_path && (
                      <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm font-medium">
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </button>
                    )}

                    {report.status === 'pending_approval' && (
                      <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                    )}
                  </div>

                  {report.status === 'sent' && report.sent_to && (
                    <div className="mt-3 text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
                      Sent to {report.sent_to} on{' '}
                      {report.sent_at ? new Date(report.sent_at).toLocaleString() : 'N/A'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

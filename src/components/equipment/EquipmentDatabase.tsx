import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { EquipmentUnit, EquipmentModel } from '../../types/database';
import { Search, Filter, FileText, History, Info } from 'lucide-react';

export default function EquipmentDatabase() {
  const [equipment, setEquipment] = useState<EquipmentUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentUnit | null>(null);

  useEffect(() => {
    fetchEquipment();
  }, [statusFilter]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('equipment_units')
        .select(`
          *,
          equipment_model:equipment_models (
            *,
            manufacturer:manufacturers (name),
            equipment_type:equipment_types (name, category)
          ),
          customer:customers (company_name, contact_person)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipment = equipment.filter((eq) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      eq.serial_number.toLowerCase().includes(searchLower) ||
      eq.asset_tag?.toLowerCase().includes(searchLower) ||
      eq.equipment_model?.model_number?.toLowerCase().includes(searchLower) ||
      eq.equipment_model?.manufacturer?.name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      in_repair: 'bg-amber-100 text-amber-800',
      retired: 'bg-slate-100 text-slate-800',
    };
    return badges[status as keyof typeof badges] || badges.active;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Equipment Database</h1>
          <p className="text-slate-600">Browse equipment specifications and history</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by serial number, model, or manufacturer..."
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
                      <option value="active">Active</option>
                      <option value="in_repair">In Repair</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
                  <p className="mt-4 text-slate-600">Loading equipment...</p>
                </div>
              ) : filteredEquipment.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-600">No equipment found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredEquipment.map((eq) => (
                    <div
                      key={eq.id}
                      onClick={() => setSelectedEquipment(eq)}
                      className={`p-6 hover:bg-slate-50 transition cursor-pointer ${
                        selectedEquipment?.id === eq.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900">
                              {eq.equipment_model?.manufacturer?.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                                eq.status
                              )}`}
                            >
                              {eq.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            {eq.equipment_model?.model_number}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Serial Number:</span>
                          <p className="font-mono text-slate-900">{eq.serial_number}</p>
                        </div>
                        {eq.asset_tag && (
                          <div>
                            <span className="text-slate-500">Asset Tag:</span>
                            <p className="text-slate-900">{eq.asset_tag}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">Customer:</span>
                          <p className="text-slate-900">{eq.customer?.company_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Location:</span>
                          <p className="text-slate-900">{eq.location || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedEquipment ? (
              <div className="bg-white rounded-lg border border-slate-200 sticky top-6">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">
                    Equipment Details
                  </h2>
                  <p className="text-sm text-slate-600">{selectedEquipment.serial_number}</p>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Specifications
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-500">Manufacturer:</span>
                        <p className="text-slate-900 font-medium">
                          {selectedEquipment.equipment_model?.manufacturer?.name}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Model:</span>
                        <p className="text-slate-900">
                          {selectedEquipment.equipment_model?.model_number}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Type:</span>
                        <p className="text-slate-900 capitalize">
                          {selectedEquipment.equipment_model?.equipment_type?.category}
                        </p>
                      </div>
                      {selectedEquipment.operational_hours > 0 && (
                        <div>
                          <span className="text-slate-500">Operating Hours:</span>
                          <p className="text-slate-900">
                            {selectedEquipment.operational_hours.toLocaleString()} hrs
                          </p>
                        </div>
                      )}
                      {selectedEquipment.installation_date && (
                        <div>
                          <span className="text-slate-500">Installation Date:</span>
                          <p className="text-slate-900">
                            {new Date(selectedEquipment.installation_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <span className="text-slate-900 font-medium">View Documentation</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                      <History className="w-5 h-5 text-slate-600" />
                      <span className="text-slate-900 font-medium">Service History</span>
                    </button>
                  </div>

                  {selectedEquipment.equipment_model?.specifications &&
                    Object.keys(selectedEquipment.equipment_model.specifications).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">
                          Technical Specifications
                        </h3>
                        <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                          {Object.entries(selectedEquipment.equipment_model.specifications).map(
                            ([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-slate-600 capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="text-slate-900 font-medium">
                                  {String(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center sticky top-6">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600">Select equipment to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, AlertCircle, Package } from 'lucide-react';

interface Manufacturer {
  id: string;
  name: string;
}

interface EquipmentType {
  id: string;
  name: string;
  category: string;
}

interface EquipmentModel {
  id: string;
  manufacturer_id: string;
  equipment_type_id: string;
  model_number: string;
  description: string | null;
  specifications: any;
  manufacturer?: Manufacturer;
  equipment_type?: EquipmentType;
}

interface Customer {
  id: string;
  name: string;
}

interface CustomerLocation {
  id: string;
  customer_id: string;
  location_name: string;
  city: string | null;
  state: string | null;
}

interface EquipmentUnit {
  id: string;
  equipment_model_id: string;
  serial_number: string;
  asset_tag: string | null;
  customer_id: string | null;
  location_id: string | null;
  installation_date: string | null;
  status: string;
  operational_hours: number;
}

export default function EquipmentManagement() {
  const [view, setView] = useState<'models' | 'units'>('models');
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipmentModels, setEquipmentModels] = useState<EquipmentModel[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [showModelForm, setShowModelForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mfgRes, typesRes, modelsRes, cusRes] = await Promise.all([
        supabase.from('manufacturers').select('id, name').order('name'),
        supabase.from('equipment_types').select('id, name, category').order('name'),
        supabase
          .from('equipment_models')
          .select(
            `
            *,
            manufacturer:manufacturers(id, name),
            equipment_type:equipment_types(id, name, category)
          `
          )
          .order('model_number'),
        supabase.from('customers').select('id, name').order('name'),
      ]);

      if (mfgRes.error) throw mfgRes.error;
      if (typesRes.error) throw typesRes.error;
      if (modelsRes.error) throw modelsRes.error;
      if (cusRes.error) throw cusRes.error;

      setManufacturers(mfgRes.data || []);
      setEquipmentTypes(typesRes.data || []);
      setEquipmentModels(modelsRes.data || []);
      setCustomers(cusRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerLocations = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_locations')
        .select('id, customer_id, location_name, city, state')
        .eq('customer_id', customerId)
        .order('location_name');

      if (error) throw error;
      setCustomerLocations(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveEquipmentModel = async (modelData: Partial<EquipmentModel>) => {
    try {
      const { error } = await supabase.from('equipment_models').insert([modelData]);

      if (error) throw error;
      setShowModelForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveEquipmentUnit = async (unitData: Partial<EquipmentUnit>) => {
    try {
      const { error } = await supabase.from('equipment_units').insert([unitData]);

      if (error) throw error;
      setShowUnitForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Equipment Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView('models')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'models'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Models
          </button>
          <button
            onClick={() => setView('units')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'units'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Units
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {view === 'models' ? (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowModelForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Equipment Model
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
              </div>
            ) : equipmentModels.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No equipment models yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                        Manufacturer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                        Model Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {equipmentModels.map((model) => (
                      <tr key={model.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {model.manufacturer?.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {model.model_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {model.equipment_type?.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {model.description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowUnitForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Equipment Unit
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
            <p className="text-slate-600">Equipment units management coming soon</p>
            <p className="text-sm text-slate-500 mt-2">
              Click "Add Equipment Unit" to create new units
            </p>
          </div>
        </div>
      )}

      {showModelForm && (
        <EquipmentModelForm
          manufacturers={manufacturers}
          equipmentTypes={equipmentTypes}
          onSave={saveEquipmentModel}
          onClose={() => setShowModelForm(false)}
        />
      )}

      {showUnitForm && (
        <EquipmentUnitForm
          equipmentModels={equipmentModels}
          customers={customers}
          customerLocations={customerLocations}
          onCustomerChange={loadCustomerLocations}
          onSave={saveEquipmentUnit}
          onClose={() => setShowUnitForm(false)}
        />
      )}
    </div>
  );
}

function EquipmentModelForm({
  manufacturers,
  equipmentTypes,
  onSave,
  onClose,
}: {
  manufacturers: Manufacturer[];
  equipmentTypes: EquipmentType[];
  onSave: (data: Partial<EquipmentModel>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<EquipmentModel>>({
    manufacturer_id: '',
    equipment_type_id: '',
    model_number: '',
    description: '',
    specifications: {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Add Equipment Model</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Manufacturer *
            </label>
            <select
              required
              value={formData.manufacturer_id}
              onChange={(e) =>
                setFormData({ ...formData, manufacturer_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Select manufacturer</option>
              {manufacturers.map((mfg) => (
                <option key={mfg.id} value={mfg.id}>
                  {mfg.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Equipment Type *
            </label>
            <select
              required
              value={formData.equipment_type_id}
              onChange={(e) =>
                setFormData({ ...formData, equipment_type_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Select type</option>
              {equipmentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Model Number *
            </label>
            <input
              type="text"
              required
              value={formData.model_number}
              onChange={(e) =>
                setFormData({ ...formData, model_number: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Model
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EquipmentUnitForm({
  equipmentModels,
  customers,
  customerLocations,
  onCustomerChange,
  onSave,
  onClose,
}: {
  equipmentModels: EquipmentModel[];
  customers: Customer[];
  customerLocations: CustomerLocation[];
  onCustomerChange: (customerId: string) => void;
  onSave: (data: Partial<EquipmentUnit>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<EquipmentUnit>>({
    equipment_model_id: '',
    serial_number: '',
    asset_tag: '',
    customer_id: '',
    location_id: '',
    installation_date: '',
    status: 'active',
    operational_hours: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleCustomerChange = (customerId: string) => {
    setFormData({ ...formData, customer_id: customerId, location_id: '' });
    onCustomerChange(customerId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Add Equipment Unit</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Equipment Model *
            </label>
            <select
              required
              value={formData.equipment_model_id}
              onChange={(e) =>
                setFormData({ ...formData, equipment_model_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Select equipment model</option>
              {equipmentModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.manufacturer?.name} {model.model_number}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Serial Number *
              </label>
              <input
                type="text"
                required
                value={formData.serial_number}
                onChange={(e) =>
                  setFormData({ ...formData, serial_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Asset Tag
              </label>
              <input
                type="text"
                value={formData.asset_tag || ''}
                onChange={(e) =>
                  setFormData({ ...formData, asset_tag: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Customer
            </label>
            <select
              value={formData.customer_id || ''}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {formData.customer_id && customerLocations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location
              </label>
              <select
                value={formData.location_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, location_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Select location</option>
                {customerLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.location_name}
                    {location.city && location.state
                      ? ` - ${location.city}, ${location.state}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Installation Date
              </label>
              <input
                type="date"
                value={formData.installation_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, installation_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="active">Active</option>
                <option value="in_repair">In Repair</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Operational Hours
            </label>
            <input
              type="number"
              min="0"
              value={formData.operational_hours}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  operational_hours: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Equipment Unit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

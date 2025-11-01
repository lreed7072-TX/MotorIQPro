import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Customer {
  id: string;
  name: string;
  locations?: CustomerLocation[];
}

interface CustomerLocation {
  id: string;
  customer_id: string;
  location_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
}

interface EquipmentUnit {
  id: string;
  serial_number: string;
  equipment_model: {
    model_number: string;
    manufacturer: {
      name: string;
    };
  };
}

interface EquipmentModel {
  id: string;
  model_number: string;
  manufacturer: {
    id: string;
    name: string;
  };
}

interface Manufacturer {
  id: string;
  name: string;
}

interface EquipmentType {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface CreateWorkOrderProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateWorkOrder({ onClose, onSuccess }: CreateWorkOrderProps) {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipmentUnits, setEquipmentUnits] = useState<EquipmentUnit[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewEquipment, setShowNewEquipment] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    equipment_unit_id: '',
    work_type: 'repair',
    priority: 'medium',
    reported_issue: '',
    assigned_to: '',
  });

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [customersRes, equipmentRes, techsRes] = await Promise.all([
        supabase
          .from('customers')
          .select(`
            id,
            name,
            locations:customer_locations(id, customer_id, location_name, address, city, state)
          `)
          .order('name'),
        supabase
          .from('equipment_units')
          .select(
            `
            id,
            serial_number,
            equipment_model:equipment_models (
              model_number,
              manufacturer:manufacturers (name)
            )
          `
          )
          .order('serial_number'),
        supabase.from('users').select('id, full_name').order('full_name'),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (equipmentRes.error) throw equipmentRes.error;
      if (techsRes.error) throw techsRes.error;

      setCustomers(customersRes.data || []);
      setEquipmentUnits(equipmentRes.data || []);
      setTechnicians(techsRes.data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const generateWorkOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `WO-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const workOrderNumber = generateWorkOrderNumber();

      const { error: insertError } = await supabase.from('work_orders').insert({
        work_order_number: workOrderNumber,
        customer_id: formData.customer_id,
        equipment_unit_id: formData.equipment_unit_id,
        work_type: formData.work_type,
        priority: formData.priority,
        reported_issue: formData.reported_issue,
        assigned_to: formData.assigned_to || null,
        status: 'pending',
        created_by: profile?.id,
      });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewCustomerCreated = async (customerId: string) => {
    setShowNewCustomer(false);
    await loadFormData();
    setFormData({ ...formData, customer_id: customerId });
  };

  const handleNewEquipmentCreated = async (equipmentId: string) => {
    setShowNewEquipment(false);
    await loadFormData();
    setFormData({ ...formData, equipment_unit_id: equipmentId });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Create Work Order</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Customer *
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  New Customer
                </button>
              </div>
              <select
                required
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData({ ...formData, customer_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Equipment Unit *
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewEquipment(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  New Equipment
                </button>
              </div>
              <select
                required
                value={formData.equipment_unit_id}
                onChange={(e) =>
                  setFormData({ ...formData, equipment_unit_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Select equipment</option>
                {equipmentUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.equipment_model?.manufacturer?.name}{' '}
                    {unit.equipment_model?.model_number} - S/N: {unit.serial_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Work Type *
                </label>
                <select
                  required
                  value={formData.work_type}
                  onChange={(e) =>
                    setFormData({ ...formData, work_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="repair">Repair</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                  <option value="installation">Installation</option>
                  <option value="diagnostic">Diagnostic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priority *
                </label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign to Technician
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) =>
                  setFormData({ ...formData, assigned_to: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Unassigned</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reported Issue *
              </label>
              <textarea
                required
                value={formData.reported_issue}
                onChange={(e) =>
                  setFormData({ ...formData, reported_issue: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                placeholder="Describe the issue or work to be performed..."
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
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Work Order'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showNewCustomer && (
        <QuickCustomerForm
          onClose={() => setShowNewCustomer(false)}
          onSuccess={handleNewCustomerCreated}
        />
      )}

      {showNewEquipment && (
        <QuickEquipmentForm
          customers={customers}
          onClose={() => setShowNewEquipment(false)}
          onSuccess={handleNewEquipmentCreated}
        />
      )}
    </>
  );
}

function QuickCustomerForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (customerId: string) => void;
}) {
  const [customerData, setCustomerData] = useState({
    name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
  });
  const [locations, setLocations] = useState<Array<{
    location_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    is_primary: boolean;
  }>>([
    {
      location_name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      is_primary: true,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addLocation = () => {
    setLocations([
      ...locations,
      {
        location_name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        is_primary: false,
      },
    ]);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: string, value: any) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setLocations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (customerError) throw customerError;

      const validLocations = locations.filter((loc) => loc.location_name.trim() !== '');

      if (validLocations.length > 0) {
        const locationsToInsert = validLocations.map((loc) => ({
          ...loc,
          customer_id: customer.id,
        }));

        const { error: locError } = await supabase
          .from('customer_locations')
          .insert(locationsToInsert);

        if (locError) throw locError;
      }

      onSuccess(customer.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Add New Customer</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Customer Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerData.name}
                  onChange={(e) =>
                    setCustomerData({ ...customerData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={customerData.contact_name}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, contact_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={customerData.contact_phone}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, contact_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={customerData.contact_email}
                  onChange={(e) =>
                    setCustomerData({ ...customerData, contact_email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Locations</h3>
              <button
                type="button"
                onClick={addLocation}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3 h-3" />
                Add Location
              </button>
            </div>

            <div className="space-y-4">
              {locations.map((location, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-700">
                      Location {index + 1}
                      {location.is_primary && (
                        <span className="ml-2 text-xs text-blue-600">(Primary)</span>
                      )}
                    </h4>
                    {locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLocation(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Location Name *"
                      required
                      value={location.location_name}
                      onChange={(e) =>
                        updateLocation(index, 'location_name', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />

                    <input
                      type="text"
                      placeholder="Address"
                      value={location.address}
                      onChange={(e) => updateLocation(index, 'address', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        value={location.city}
                        onChange={(e) => updateLocation(index, 'city', e.target.value)}
                        className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        maxLength={2}
                        value={location.state}
                        onChange={(e) =>
                          updateLocation(index, 'state', e.target.value.toUpperCase())
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="ZIP Code"
                      value={location.zip_code}
                      onChange={(e) => updateLocation(index, 'zip_code', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickEquipmentForm({
  customers,
  onClose,
  onSuccess,
}: {
  customers: Customer[];
  onClose: () => void;
  onSuccess: (equipmentId: string) => void;
}) {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipmentModels, setEquipmentModels] = useState<EquipmentModel[]>([]);
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [showNewModel, setShowNewModel] = useState(false);
  const [showNewManufacturer, setShowNewManufacturer] = useState(false);
  const [showNewType, setShowNewType] = useState(false);

  const [formData, setFormData] = useState({
    equipment_model_id: '',
    serial_number: '',
    asset_tag: '',
    customer_id: '',
    location_id: '',
    status: 'active',
  });

  const [newModel, setNewModel] = useState({
    manufacturer_id: '',
    equipment_type_id: '',
    model_number: '',
  });

  const [newManufacturer, setNewManufacturer] = useState('');
  const [newType, setNewType] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mfgRes, typesRes, modelsRes] = await Promise.all([
        supabase.from('manufacturers').select('id, name').order('name'),
        supabase.from('equipment_types').select('id, name').order('name'),
        supabase
          .from('equipment_models')
          .select('id, model_number, manufacturer:manufacturers(id, name)')
          .order('model_number'),
      ]);

      if (mfgRes.error) throw mfgRes.error;
      if (typesRes.error) throw typesRes.error;
      if (modelsRes.error) throw modelsRes.error;

      setManufacturers(mfgRes.data || []);
      setEquipmentTypes(typesRes.data || []);
      setEquipmentModels(modelsRes.data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    setFormData({ ...formData, customer_id: customerId, location_id: '' });

    if (!customerId) {
      setCustomerLocations([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_locations')
        .select('id, customer_id, location_name, address, city, state')
        .eq('customer_id', customerId)
        .order('location_name');

      if (error) throw error;
      setCustomerLocations(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createNewManufacturer = async () => {
    if (!newManufacturer.trim()) return;

    try {
      const { data, error } = await supabase
        .from('manufacturers')
        .insert([{ name: newManufacturer }])
        .select()
        .single();

      if (error) throw error;

      setManufacturers([...manufacturers, data]);
      setNewModel({ ...newModel, manufacturer_id: data.id });
      setShowNewManufacturer(false);
      setNewManufacturer('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createNewType = async () => {
    if (!newType.trim()) return;

    try {
      const { data, error } = await supabase
        .from('equipment_types')
        .insert([{ name: newType }])
        .select()
        .single();

      if (error) throw error;

      setEquipmentTypes([...equipmentTypes, data]);
      setNewModel({ ...newModel, equipment_type_id: data.id });
      setShowNewType(false);
      setNewType('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createNewModel = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_models')
        .insert([newModel])
        .select('id, model_number, manufacturer:manufacturers(id, name)')
        .single();

      if (error) throw error;

      setEquipmentModels([...equipmentModels, data]);
      setFormData({ ...formData, equipment_model_id: data.id });
      setShowNewModel(false);
      setNewModel({ manufacturer_id: '', equipment_type_id: '', model_number: '' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: unitError } = await supabase
        .from('equipment_units')
        .insert([formData])
        .select()
        .single();

      if (unitError) throw unitError;

      onSuccess(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Add New Equipment</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!showNewModel ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Equipment Model *
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewModel(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  New Model
                </button>
              </div>
              <select
                required
                value={formData.equipment_model_id}
                onChange={(e) =>
                  setFormData({ ...formData, equipment_model_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Select model</option>
                {equipmentModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.manufacturer.name} {model.model_number}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">New Equipment Model</h3>
                <button
                  type="button"
                  onClick={() => setShowNewModel(false)}
                  className="text-slate-600 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {!showNewManufacturer ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">Manufacturer</label>
                      <button
                        type="button"
                        onClick={() => setShowNewManufacturer(true)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="w-3 h-3" />
                        New
                      </button>
                    </div>
                    <select
                      required={showNewModel}
                      value={newModel.manufacturer_id}
                      onChange={(e) =>
                        setNewModel({ ...newModel, manufacturer_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Manufacturer</option>
                      {manufacturers.map((mfg) => (
                        <option key={mfg.id} value={mfg.id}>
                          {mfg.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-slate-300 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-700">New Manufacturer</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewManufacturer(false);
                          setNewManufacturer('');
                        }}
                        className="text-slate-600 hover:text-slate-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Manufacturer name"
                        value={newManufacturer}
                        onChange={(e) => setNewManufacturer(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={createNewManufacturer}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {!showNewType ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">Equipment Type</label>
                      <button
                        type="button"
                        onClick={() => setShowNewType(true)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="w-3 h-3" />
                        New
                      </button>
                    </div>
                    <select
                      required={showNewModel}
                      value={newModel.equipment_type_id}
                      onChange={(e) =>
                        setNewModel({ ...newModel, equipment_type_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Equipment Type</option>
                      {equipmentTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-slate-300 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-700">New Equipment Type</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewType(false);
                          setNewType('');
                        }}
                        className="text-slate-600 hover:text-slate-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Equipment type name"
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={createNewType}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  required={showNewModel}
                  placeholder="Model Number"
                  value={newModel.model_number}
                  onChange={(e) =>
                    setNewModel({ ...newModel, model_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />

                <button
                  type="button"
                  onClick={createNewModel}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                >
                  Create Model
                </button>
              </div>
            </div>
          )}

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
                value={formData.asset_tag}
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
              value={formData.customer_id}
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
                value={formData.location_id}
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

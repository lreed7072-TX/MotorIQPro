import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, Building2, Package, Wrench, Trash2, Plus, X } from 'lucide-react';
import CustomerManagement from './CustomerManagement';
import EquipmentManagement from './EquipmentManagement';

interface User {
  id: string;
  full_name: string;
  role: 'admin' | 'manager' | 'technician';
  certification_level: string | null;
  employee_id: string | null;
  phone: string | null;
  email?: string;
}

interface Customer {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

interface Manufacturer {
  id: string;
  name: string;
  website: string | null;
  support_phone: string | null;
  support_email: string | null;
}

export default function AdminSettings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'customers' | 'manufacturers' | 'equipment'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        await loadUsers();
      } else if (activeTab === 'customers') {
        await loadCustomers();
      } else if (activeTab === 'manufacturers') {
        await loadManufacturers();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data: usersData, error: usersError } = await supabase
      .from('users_with_email')
      .select('*')
      .order('full_name');

    if (usersError) throw usersError;
    setUsers(usersData || []);
  };

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, company_name, contact_person, email, phone, address, created_at')
      .order('company_name');

    if (error) throw error;

    const mappedData = data?.map(customer => ({
      id: customer.id,
      name: customer.company_name,
      contact_name: customer.contact_person,
      contact_email: customer.email,
      contact_phone: customer.phone,
      address: customer.address?.street || null,
      city: customer.address?.city || null,
      state: customer.address?.state || null,
      zip_code: customer.address?.zip_code || null,
    }));

    setCustomers(mappedData || []);
  };

  const loadManufacturers = async () => {
    const { data, error } = await supabase
      .from('manufacturers')
      .select('id, name, contact_info, support_url, created_at')
      .order('name');

    if (error) throw error;

    const mappedData = data?.map(manufacturer => ({
      id: manufacturer.id,
      name: manufacturer.name,
      website: manufacturer.support_url,
      support_phone: manufacturer.contact_info?.phone || null,
      support_email: manufacturer.contact_info?.email || null,
    }));

    setManufacturers(mappedData || []);
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'manager' | 'technician') => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw error;
    await loadUsers();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    await loadUsers();
  };

  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) throw error;
    await loadCustomers();
  };

  const deleteManufacturer = async (manufacturerId: string) => {
    if (!confirm('Are you sure you want to delete this manufacturer?')) return;

    const { error } = await supabase
      .from('manufacturers')
      .delete()
      .eq('id', manufacturerId);

    if (error) throw error;
    await loadManufacturers();
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600">Manage users, customers, and system settings</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex">
            {isAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition ${
                  activeTab === 'users'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-5 h-5" />
                Users
              </button>
            )}
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition ${
                activeTab === 'customers'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-5 h-5" />
              Customers
            </button>
            <button
              onClick={() => setActiveTab('manufacturers')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition ${
                activeTab === 'manufacturers'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-5 h-5" />
              Manufacturers
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition ${
                activeTab === 'equipment'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-5 h-5" />
              Equipment
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-slate-600">Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'users' && isAdmin && (
                <UsersTab
                  users={users}
                  onUpdateRole={updateUserRole}
                  onDelete={deleteUser}
                />
              )}
              {activeTab === 'customers' && <CustomerManagement />}
              {activeTab === 'manufacturers' && (
                <ManufacturersTab
                  manufacturers={manufacturers}
                  onReload={loadManufacturers}
                  onDelete={deleteManufacturer}
                />
              )}
              {activeTab === 'equipment' && <EquipmentManagement />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users, onUpdateRole, onDelete }: {
  users: User[];
  onUpdateRole: (id: string, role: 'admin' | 'manager' | 'technician') => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'technician' as 'admin' | 'manager' | 'technician',
    employee_id: '',
    phone: '',
    certification_level: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from('users').insert([
          {
            id: authData.user.id,
            full_name: formData.full_name,
            role: formData.role,
            employee_id: formData.employee_id || null,
            phone: formData.phone || null,
            certification_level: formData.certification_level || null,
          },
        ]);

        if (profileError) throw profileError;
      }

      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'technician',
        employee_id: '',
        phone: '',
        certification_level: '',
      });
      setShowAddForm(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Add New User</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setError('');
              }}
              className="p-1 hover:bg-slate-200 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Certification Level
                </label>
                <input
                  type="text"
                  value={formData.certification_level}
                  onChange={(e) =>
                    setFormData({ ...formData, certification_level: e.target.value })
                  }
                  placeholder="e.g., Level 2 Certified"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Role</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Employee ID</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Phone</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm text-slate-900">{user.full_name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{user.email}</td>
                <td className="py-3 px-4">
                  <select
                    value={user.role}
                    onChange={(e) => onUpdateRole(user.id, e.target.value as any)}
                    className="text-sm border border-slate-300 rounded px-2 py-1 capitalize"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="technician">Technician</option>
                  </select>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{user.employee_id || '-'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{user.phone || '-'}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onDelete(user.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomersTab({ customers, onReload, onDelete }: {
  customers: Customer[];
  onReload: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('customers')
      .insert([formData]);

    if (error) {
      alert('Error adding customer: ' + error.message);
      return;
    }

    setShowForm(false);
    setFormData({});
    await onReload();
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Customer Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Customer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Customer Name *"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Contact Name"
              value={formData.contact_name || ''}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="email"
              placeholder="Contact Email"
              value={formData.contact_email || ''}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="tel"
              placeholder="Contact Phone"
              value={formData.contact_phone || ''}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Address"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="City"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="State"
              value={formData.state || ''}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="ZIP Code"
              value={formData.zip_code || ''}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Customer
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Contact</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Phone</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Location</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm font-medium text-slate-900">{customer.name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{customer.contact_name || '-'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{customer.contact_email || '-'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{customer.contact_phone || '-'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {customer.city && customer.state ? `${customer.city}, ${customer.state}` : '-'}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onDelete(customer.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManufacturersTab({ manufacturers, onReload, onDelete }: {
  manufacturers: Manufacturer[];
  onReload: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Manufacturer>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('manufacturers')
      .insert([formData]);

    if (error) {
      alert('Error adding manufacturer: ' + error.message);
      return;
    }

    setShowForm(false);
    setFormData({});
    await onReload();
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Manufacturer Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Manufacturer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Manufacturer Name *"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="url"
              placeholder="Website"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="tel"
              placeholder="Support Phone"
              value={formData.support_phone || ''}
              onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="email"
              placeholder="Support Email"
              value={formData.support_email || ''}
              onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Manufacturer
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Website</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Support Phone</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Support Email</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {manufacturers.map((manufacturer) => (
              <tr key={manufacturer.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm font-medium text-slate-900">{manufacturer.name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {manufacturer.website ? (
                    <a href={manufacturer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {manufacturer.website}
                    </a>
                  ) : '-'}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{manufacturer.support_phone || '-'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{manufacturer.support_email || '-'}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onDelete(manufacturer.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

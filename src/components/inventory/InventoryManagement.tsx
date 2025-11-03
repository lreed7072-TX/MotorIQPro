import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Plus, Package, AlertTriangle, TrendingDown, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface InventoryPart {
  id: string;
  part_number: string;
  part_name: string;
  description: string | null;
  category: string;
  manufacturer: string | null;
  supplier: string | null;
  quantity_in_stock: number;
  minimum_stock_level: number;
  unit_price: number;
  location: string | null;
  created_at: string;
}

export default function InventoryManagement() {
  const { profile } = useAuth();
  const [parts, setParts] = useState<InventoryPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({
    totalParts: 0,
    lowStock: 0,
    totalValue: 0,
  });

  const canManage = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    fetchParts();
  }, [categoryFilter]);

  const fetchParts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('inventory_parts')
        .select('*')
        .order('part_number', { ascending: true });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setParts(data || []);

      const totalParts = data?.length || 0;
      const lowStock = data?.filter(p => p.quantity_in_stock <= p.minimum_stock_level).length || 0;
      const totalValue = data?.reduce((sum, p) => sum + (p.quantity_in_stock * p.unit_price), 0) || 0;

      setStats({ totalParts, lowStock, totalValue });
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParts = parts.filter((part) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      part.part_number.toLowerCase().includes(searchLower) ||
      part.part_name.toLowerCase().includes(searchLower) ||
      part.manufacturer?.toLowerCase().includes(searchLower)
    );
  });

  const getStockStatus = (part: InventoryPart) => {
    if (part.quantity_in_stock === 0) {
      return { label: 'Out of Stock', class: 'bg-red-100 text-red-800' };
    } else if (part.quantity_in_stock <= part.minimum_stock_level) {
      return { label: 'Low Stock', class: 'bg-amber-100 text-amber-800' };
    }
    return { label: 'In Stock', class: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Inventory Management</h1>
        <p className="text-slate-600">Track parts and supplies for motor repairs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Parts</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.totalParts}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Low Stock Items</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.lowStock}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Value</p>
              <p className="text-2xl font-semibold text-slate-900">${stats.totalValue.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by part number, name, or manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                >
                  <option value="all">All Categories</option>
                  <option value="bearings">Bearings</option>
                  <option value="windings">Windings</option>
                  <option value="shafts">Shafts</option>
                  <option value="electrical">Electrical</option>
                  <option value="hardware">Hardware</option>
                  <option value="lubricants">Lubricants</option>
                  <option value="tools">Tools</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {canManage && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Part</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
            <p className="mt-4 text-slate-600">Loading inventory...</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No parts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredParts.map((part) => {
                  const status = getStockStatus(part);
                  return (
                    <tr key={part.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{part.part_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">{part.part_name}</div>
                        {part.description && (
                          <div className="text-xs text-slate-500 mt-1">{part.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 capitalize">
                        {part.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {part.manufacturer || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{part.quantity_in_stock}</div>
                        <div className="text-xs text-slate-500">Min: {part.minimum_stock_level}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        ${part.unit_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {part.location || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

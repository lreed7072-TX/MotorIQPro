import { ReactNode, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Calendar,
  Package,
  MessageSquare,
  Clock,
  BarChart3,
  FileSpreadsheet,
  FolderOpen
} from 'lucide-react';
import OfflineIndicator from '../shared/OfflineIndicator';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export default function DashboardLayout({ children, currentPage = 'dashboard', onNavigate }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const isTechnician = profile?.role === 'technician';
  const isSalesperson = profile?.role === 'salesperson';

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'dashboard', roles: ['all'] },
    { name: 'Work Orders', icon: ClipboardList, page: 'work-orders', roles: ['all'] },
    { name: 'Scheduling', icon: Calendar, page: 'scheduling', roles: ['admin', 'manager'] },
    { name: 'Equipment', icon: Wrench, page: 'equipment', roles: ['all'] },
    { name: 'Inventory', icon: Package, page: 'inventory', roles: ['admin', 'manager', 'technician'] },
    { name: 'Quotes', icon: FileSpreadsheet, page: 'quotes', roles: ['admin', 'manager', 'salesperson'] },
    { name: 'Documents', icon: FolderOpen, page: 'documents', roles: ['all'] },
    { name: 'Messages', icon: MessageSquare, page: 'messages', roles: ['all'] },
    { name: 'Time Clock', icon: Clock, page: 'time-clock', roles: ['technician'] },
    { name: 'Analytics', icon: BarChart3, page: 'analytics', roles: ['admin', 'manager'] },
    { name: 'Reports', icon: FileText, page: 'reports', roles: ['all'] },
  ].filter(item =>
    item.roles.includes('all') ||
    item.roles.includes(profile?.role || '')
  );

  if (isAdmin || isManager) {
    navigation.push({ name: 'Settings', icon: Settings, page: 'settings', roles: ['admin', 'manager'] });
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">MotorIQ Pro</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-30 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-200 hidden lg:block">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-slate-900">MotorIQ Pro</h1>
                <p className="text-xs text-slate-500">Field Service</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.name}
                  onClick={() => onNavigate?.(item.page as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 capitalize">{profile?.role || 'Technician'}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0">
        {children}
      </main>

      <OfflineIndicator />
    </div>
  );
}

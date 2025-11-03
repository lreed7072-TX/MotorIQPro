import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import DashboardLayout from './components/layout/DashboardLayout';
import WorkOrdersList from './components/work-orders/WorkOrdersList';
import EquipmentDatabase from './components/equipment/EquipmentDatabase';
import ReportsList from './components/reports/ReportsList';
import SchedulingCalendar from './components/scheduling/SchedulingCalendar';
import AdminSettings from './components/admin/AdminSettings';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'work-orders':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <WorkOrdersList />
          </DashboardLayout>
        );
      case 'equipment':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <EquipmentDatabase />
          </DashboardLayout>
        );
      case 'scheduling':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <SchedulingCalendar />
          </DashboardLayout>
        );
      case 'inventory':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>
              <p className="text-slate-600">Inventory management UI coming soon...</p>
            </div>
          </DashboardLayout>
        );
      case 'quotes':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Quotes & Contracts</h1>
              <p className="text-slate-600">Quote management UI coming soon...</p>
            </div>
          </DashboardLayout>
        );
      case 'messages':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Messages</h1>
              <p className="text-slate-600">Messaging UI coming soon...</p>
            </div>
          </DashboardLayout>
        );
      case 'time-clock':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Time Clock</h1>
              <p className="text-slate-600">Time tracking UI coming soon...</p>
            </div>
          </DashboardLayout>
        );
      case 'analytics':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Analytics</h1>
              <p className="text-slate-600">Analytics dashboard UI coming soon...</p>
            </div>
          </DashboardLayout>
        );
      case 'reports':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <ReportsList />
          </DashboardLayout>
        );
      case 'settings':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <AdminSettings />
          </DashboardLayout>
        );
      default:
        return <Dashboard />;
    }
  };

  if (currentPage === 'dashboard') {
    return <Dashboard onNavigate={setCurrentPage} />;
  }

  return renderPage();
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

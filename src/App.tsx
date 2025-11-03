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
import InventoryManagement from './components/inventory/InventoryManagement';
import QuotesManagement from './components/quotes/QuotesManagement';
import MessagesCenter from './components/messages/MessagesCenter';
import TimeClock from './components/time-clock/TimeClock';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

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
            <InventoryManagement />
          </DashboardLayout>
        );
      case 'quotes':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <QuotesManagement />
          </DashboardLayout>
        );
      case 'messages':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <MessagesCenter />
          </DashboardLayout>
        );
      case 'time-clock':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <TimeClock />
          </DashboardLayout>
        );
      case 'analytics':
        return (
          <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <AnalyticsDashboard />
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

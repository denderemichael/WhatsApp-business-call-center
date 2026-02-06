import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ReportPanel } from '@/components/dashboard/ReportPanel';
import { Navigate } from 'react-router-dom';

function ReportsContent() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 max-w-2xl mx-auto w-full">
            <ReportPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only admin and branch manager can access reports
  if (user?.role !== 'admin' && user?.role !== 'branch_manager') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ChatProvider>
      <ReportsContent />
    </ChatProvider>
  );
}

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { Navigate } from 'react-router-dom';

function AnalyticsContent() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <div className="flex-1 overflow-auto">
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only admin and branch manager can access analytics
  if (user?.role !== 'admin' && user?.role !== 'branch_manager') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ChatProvider>
      <AnalyticsContent />
    </ChatProvider>
  );
}

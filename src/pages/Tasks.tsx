import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TaskPanel } from '@/components/dashboard/TaskPanel';
import { Navigate } from 'react-router-dom';

function TasksContent() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1">
            <TaskPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <TasksContent />;
}

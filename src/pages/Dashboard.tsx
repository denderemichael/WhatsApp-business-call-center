import { useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ConversationList } from '@/components/dashboard/ConversationList';
import { ChatWindow } from '@/components/dashboard/ChatWindow';
import { CustomerContextPanel } from '@/components/dashboard/CustomerContextPanel';
import { Navigate } from 'react-router-dom';

function DashboardContent() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DashboardSidebar />
      <div className="flex flex-1 overflow-hidden">
        <ConversationList />
        <ChatWindow />
        <CustomerContextPanel />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ChatProvider>
      <DashboardContent />
    </ChatProvider>
  );
}

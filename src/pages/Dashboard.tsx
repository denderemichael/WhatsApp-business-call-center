import { useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ConversationList } from '@/components/dashboard/ConversationList';
import { ChatWindow } from '@/components/dashboard/ChatWindow';
import { CustomerContextPanel } from '@/components/dashboard/CustomerContextPanel';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';

function DashboardContent() {
  const [showConversationList, setShowConversationList] = useState(true);
  const [showCustomerContext, setShowCustomerContext] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DashboardSidebar 
        showConversationList={showConversationList}
        setShowConversationList={setShowConversationList}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <div className="flex flex-1 overflow-hidden">
          {showConversationList && <ConversationList />}
          <ChatWindow />
          {showCustomerContext && <CustomerContextPanel onClose={() => setShowCustomerContext(false)} />}
        </div>
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

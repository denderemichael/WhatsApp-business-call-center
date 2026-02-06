/**
 * API Context - Integrates Mock API with the existing ChatContext
 * 
 * This context provides a seamless bridge between the mock API service
 * and the existing ChatContext, allowing gradual migration to use
 * the mock API endpoints.
 */

import React, { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { useMockApi, MOCK_USERS } from '@/hooks/useMockApi';
import { Conversation, ConversationStatus, Branch, Agent, Task, TaskStatus, TaskPriority, Report, ReportStatus, Notification } from '@/types';
import { useChat } from './ChatContext';

// ============================================================================
// Types
// ============================================================================

interface ApiContextType {
  // API Integration status
  isUsingApi: boolean;
  setUsingApi: (use: boolean) => void;
  
  // Quick login helpers
  loginAsAdmin: () => Promise<void>;
  loginAsManager: (managerId: 'manager-1' | 'manager-2') => Promise<void>;
  loginAsAgent: (agentId: string) => Promise<void>;
  
  // Sync status
  lastSync: Date | null;
  isSyncing: boolean;
  
  // Debug helpers
  setLatency: (ms: number) => void;
  getAuditLogs: () => any[];
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface ApiProviderProps {
  children: ReactNode;
  autoLogin?: boolean;
}

export function ApiProvider({ children, autoLogin = true }: ApiProviderProps) {
  const chatContext = useChat();
  
  const {
    currentUser,
    isAuthenticated,
    login,
    logout,
    isLoading,
    conversations,
    fetchConversations,
    branches,
    agents,
    fetchAgents,
    updateAgentStatus,
    tasks,
    fetchTasks,
    createTask,
    updateTaskStatus,
    reports,
    fetchReports,
    submitReport,
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllAsRead,
    escalations,
    fetchEscalations,
    resolveEscalation,
    lastSync,
    subscribeToSync,
    setLatency,
  } = useMockApi({ autoLogin, defaultUserId: 'admin-1' });
  
  // Sync state
  const [isUsingApi, setUsingApi] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Sync data from API to ChatContext when using API
  useEffect(() => {
    if (isUsingApi && isAuthenticated) {
      setIsSyncing(true);
      
      // Sync conversations
      if (conversations.length > 0) {
        conversations.forEach(conv => {
          const existingConv = chatContext.conversations.find(c => c.id === conv.id);
          if (!existingConv) {
            // This is a new conversation from API
          }
        });
      }
      
      // Subscribe to real-time sync
      const unsubscribe = subscribeToSync(() => {
        // Data has been updated by the API
        setIsSyncing(false);
      });
      
      setTimeout(() => setIsSyncing(false), 1000);
      
      return unsubscribe;
    }
  }, [isUsingApi, isAuthenticated, conversations, subscribeToSync]);
  
  // Quick login helpers
  const loginAsAdmin = useCallback(async () => {
    await login(MOCK_USERS.admin.email);
  }, [login]);
  
  const loginAsManager = useCallback(async (managerId: 'manager-1' | 'manager-2') => {
    const managerKey = managerId === 'manager-1' ? 'manager1' : 'manager2';
    await login(MOCK_USERS[managerKey].email);
  }, [login]);
  
  const loginAsAgent = useCallback(async (agentId: string) => {
    const agentKey = `agent${agentId.replace('agent-', '')}` as keyof typeof MOCK_USERS;
    if (MOCK_USERS[agentKey]) {
      await login(MOCK_USERS[agentKey].email);
    }
  }, [login]);
  
  // Get audit logs
  const getAuditLogs = useCallback(() => {
    // Import dynamically to avoid circular dependency
    import('@/services/mockApiService').then(({ mockApi }) => {
      return mockApi.getAuditLogs();
    }).catch(() => []);
    return [];
  }, []);
  
  // Provide methods that use API when enabled, fallback to ChatContext
  const value: ApiContextType = {
    isUsingApi,
    setUsingApi,
    loginAsAdmin,
    loginAsManager,
    loginAsAgent,
    lastSync,
    isSyncing,
    setLatency,
    getAuditLogs,
  };
  
  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useApi(): ApiContextType {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}

// ============================================================================
// Export Helpers
// ============================================================================

// Re-export key types and functions for convenience
export { MOCK_USERS } from '@/hooks/useMockApi';

export type {
  UseMockApiOptions,
  UseMockApiReturn,
} from '@/hooks/useMockApi';

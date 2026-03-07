/**
 * Real Backend Chat Provider
 * 
 * This provider wraps the ChatContext and fetches data from the real backend API
 * instead of using mock data.
 * 
 * Usage: Replace ChatProvider with RealChatProvider in App.tsx
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChatContext, ChatContextType } from './ChatContext';
import apiService, { Case, Message, Branch } from '@/services/api';
import { useAuth } from './AuthContext';
import { Conversation, ConversationStatus, Agent, Notification, Task, TaskStatus } from '@/types';
import { mockReports } from '@/data/mockData';

const api = apiService;

// Helper to convert backend Case to frontend Conversation
function caseToConversation(caseData: Case): Conversation {
  return {
    id: caseData.id,
    customerPhone: caseData.customer_phone,
    customerName: caseData.customer_name || caseData.customer?.name || 'Unknown',
    branchId: caseData.branch_id || '',
    assignedAgentId: caseData.assigned_agent_id,
    status: mapCaseStatus(caseData.status),
    tags: [],
    notes: '',
    lastMessage: caseData.last_message || caseData.first_message || '',
    lastMessageTime: new Date(caseData.created_at),
    unreadCount: caseData.status === 'new' ? 1 : 0,
    messages: [],
    hasTask: false,
    source: 'whatsapp',
    createdAt: new Date(caseData.created_at),
  };
}

// Map backend status to frontend status
function mapCaseStatus(status: Case['status']): ConversationStatus {
  const statusMap: Record<Case['status'], ConversationStatus> = {
    new: 'new',
    open: 'assigned',
    assigned: 'assigned',
    pending: 'in_progress',
    resolved: 'resolved',
    closed: 'closed',
  };
  return statusMap[status] || 'new';
}

// Map frontend status to backend status
function mapToBackendStatus(status: ConversationStatus): Case['status'] {
  const statusMap: Record<ConversationStatus, Case['status']> = {
    new: 'new',
    assigned: 'assigned',
    in_progress: 'pending',
    escalated: 'pending', // Map escalated to pending in backend
    resolved: 'resolved',
    closed: 'closed',
  };
  return statusMap[status] || 'open';
}

interface RealChatContextType extends Omit<ChatContextType, 'conversations' | 'getBranchAgents'> {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refreshConversations: () => Promise<void>;
  refreshCurrentConversation: () => Promise<void>;
  api: typeof apiService;
  getBranchAgents: (branchId: string) => Promise<Agent[]>;
}

const RealChatContext = createContext<RealChatContextType | undefined>(undefined);

interface RealChatProviderProps {
  children: ReactNode;
  initialBranchId?: string | null;
}

export function RealChatProvider({ children, initialBranchId }: RealChatProviderProps) {
  // Get auth state
  const { isAuthenticated, user } = useAuth();
  
  // Get the mock context for methods we don't override
  const mockContext = useContext(ChatContext);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversationState] = useState<Conversation | null>(null);
  
  // Reports state - from real API
  const [reports, setReports] = useState<any[]>([]);
  
  // Tasks state - from real API
  const [tasks, setTasks] = useState<any[]>([]);
  
  // Notifications state - shared across all users
  const [notifications, setNotifications] = useState(mockContext?.notifications || []);
  
  // Store original methods from mock context
  const originalSetSelectedConversation = mockContext?.setSelectedConversation;
  
  // Fetch conversations from real API
  const fetchConversations = useCallback(async () => {
    // Skip if not authenticated
    if (!isAuthenticated || !api.isAuthenticated()) {
      console.log('Skipping fetchConversations - not authenticated');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.getCases({ limit: 100 });
      const convs = result.cases.map(caseToConversation);
      setConversations(convs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(message);
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (caseId: string): Promise<Message[]> => {
    try {
      const messages = await api.getMessages(caseId);
      return messages;
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  }, []);

  // Refresh current conversation
  const refreshCurrentConversation = useCallback(async () => {
    if (!selectedConversation) return;
    
    try {
      const caseData = await api.getCase(selectedConversation.id);
      const conversation = caseToConversation(caseData);
      const messages = await fetchMessages(selectedConversation.id);
      conversation.messages = messages.map(m => ({
        id: m.id,
        conversationId: m.case_id,
        content: m.message_text,
        senderId: m.sender_id || '',
        senderType: m.sender_type,
        timestamp: new Date(m.created_at),
        status: 'read' as const,
      }));
      
      setConversations(prev => 
        prev.map(c => c.id === conversation.id ? conversation : c)
      );
      setSelectedConversationState(conversation);
    } catch (err) {
      console.error('Error refreshing conversation:', err);
    }
  }, [selectedConversation, fetchMessages]);

  // Fetch tasks from real API
  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated || !api.isAuthenticated()) {
      console.log('Skipping fetchTasks - not authenticated');
      return;
    }
    try {
      const result = await api.getTasks();
      setTasks(result.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setTasks([]);
    }
  }, [isAuthenticated]);

  // Fetch reports from real API
  const fetchReports = useCallback(async () => {
    if (!isAuthenticated || !api.isAuthenticated()) {
      console.log('Skipping fetchReports - not authenticated');
      return;
    }
    try {
      const result = await api.getReports();
      setReports(result.reports || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setReports([]);
    }
  }, []);

  // Initial fetch - only when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchConversations();
    fetchTasks();
    fetchReports();
  }, [isAuthenticated, fetchConversations, fetchTasks, fetchReports]);

  // Polling for new messages (every 10 seconds)
  useEffect(() => {
    if (!selectedConversation) return;
    
    const interval = setInterval(() => {
      refreshCurrentConversation();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [selectedConversation, refreshCurrentConversation]);

  // Override setSelectedConversation to fetch messages
  const setSelectedConversation = useCallback((conversation: Conversation | null) => {
    if (conversation) {
      fetchMessages(conversation.id).then(messages => {
        const messagesFormatted = messages.map(m => ({
          id: m.id,
          conversationId: m.case_id,
          content: m.message_text,
          senderId: m.sender_id || '',
          senderType: m.sender_type,
          timestamp: new Date(m.created_at),
          status: 'read' as const,
        }));
        
        const convWithMessages = {
          ...conversation,
          messages: messagesFormatted,
        };
        
        setSelectedConversationState(convWithMessages);
      });
    } else {
      setSelectedConversationState(null);
    }
    
    originalSetSelectedConversation?.(conversation);
  }, [fetchMessages, originalSetSelectedConversation]);

  // Update conversation status
  const updateConversationStatus = useCallback(async (conversationId: string, status: ConversationStatus) => {
    try {
      await api.updateCase(conversationId, { 
        status: mapToBackendStatus(status) 
      });
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, status } : conv
        )
      );
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversationState(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      throw err;
    }
  }, [selectedConversation]);

  // Assign agent to conversation
  const assignConversation = useCallback(async (conversationId: string, agentId: string) => {
    try {
      await api.assignAgent(conversationId, agentId);
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, assignedAgentId: agentId, status: 'assigned' as ConversationStatus }
            : conv
        )
      );
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversationState(prev =>
          prev ? { ...prev, assignedAgentId: agentId, status: 'assigned' } : null
        );
      }
    } catch (err) {
      console.error('Error assigning agent:', err);
      throw err;
    }
  }, [selectedConversation]);

  // Send message to customer
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    try {
      const result = await api.sendMessage(conversationId, content);
      
      // Add message to local state
      const newMessage = {
        id: result.message.id,
        conversationId,
        content,
        senderId: 'current-agent',
        senderType: 'agent' as const,
        timestamp: new Date(),
        status: 'sent' as const,
      };
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                lastMessage: content,
                lastMessageTime: new Date(),
                status: conv.status === 'new' ? 'assigned' as ConversationStatus : conv.status,
              }
            : conv
        )
      );
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversationState(prev =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, newMessage],
                lastMessage: content,
                lastMessageTime: new Date(),
              }
            : null
        );
      }
      
      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [selectedConversation]);

  // Update notes
  const updateNotes = useCallback(async (conversationId: string, notes: string) => {
    // Notes are stored in extended case data - for now just update local state
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, notes } : conv
      )
    );
  }, []);

  // Get filtered conversations
  const getFilteredConversations = useCallback((branchId?: string | null, agentId?: string, status?: string) => {
    return conversations.filter(conv => {
      if (branchId && conv.branchId !== branchId) return false;
      if (agentId && conv.assignedAgentId !== agentId) return false;
      if (status && status !== 'all' && conv.status !== status) return false;
      return true;
    });
  }, [conversations]);

  // Escalate conversation
  const escalateConversation = useCallback(async (conversationId: string) => {
    try {
      await api.updateCase(conversationId, { status: 'pending' });
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, status: 'escalated' as ConversationStatus } : conv
        )
      );
      
      // Create notification
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        userId: 'admin-1',
        type: 'conversation_escalated',
        title: 'Conversation Escalated',
        message: 'A conversation has been escalated',
        isRead: false,
        createdAt: new Date(),
        link: `/dashboard?conversation=${conversationId}`,
        metadata: { conversationId },
      };
      
      mockContext?.addNotification(notification);
    } catch (err) {
      console.error('Error escalating:', err);
      throw err;
    }
  }, [mockContext]);

  // Transfer conversation
  const transferConversation = useCallback(async (conversationId: string, newAgentId: string) => {
    try {
      await api.assignAgent(conversationId, newAgentId);
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, assignedAgentId: newAgentId, status: 'assigned' as ConversationStatus }
            : conv
        )
      );
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversationState(prev =>
          prev ? { ...prev, assignedAgentId: newAgentId, status: 'assigned' } : null
        );
      }
      
      // Create notification
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        userId: newAgentId,
        type: 'chat_transferred',
        title: 'Chat Transferred',
        message: 'A conversation has been transferred to you',
        isRead: false,
        createdAt: new Date(),
        link: `/dashboard?conversation=${conversationId}`,
        metadata: { conversationId },
      };
      
      mockContext?.addNotification(notification);
    } catch (err) {
      console.error('Error transferring:', err);
      throw err;
    }
  }, [selectedConversation, mockContext]);

  // Get branch agents (from real API)
  const getBranchAgents = useCallback(async (branchId: string): Promise<Agent[]> => {
    try {
      const agents = await api.getAgents(branchId);
      return agents.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        branchId: branchId,
        status: 'offline' as const,
        activeChats: 0,
        maxChats: 5,
      }));
    } catch (err) {
      console.error('Error fetching agents:', err);
      return [];
    }
  }, []);

  // Get branches (from real API)
  const fetchBranches = useCallback(async (): Promise<Branch[]> => {
    if (!isAuthenticated || !api.isAuthenticated()) {
      console.log('Skipping fetchBranches - not authenticated');
      return [];
    }
    try {
      return await api.getBranches();
    } catch (err) {
      console.error('Error fetching branches:', err);
      return [];
    }
  }, [isAuthenticated]);

  // Branches state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(initialBranchId || null);

  // Fetch branches and agents - only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBranches().then(setBranches);
  }, [isAuthenticated, fetchBranches]);

  // Fetch agents - fetch all when no branch selected
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchAgents = async () => {
      try {
        // Pass undefined to get all agents, or branch_id to filter
        const branchId = selectedBranchId || undefined;
        const result = await api.getAgents(branchId);
        setAgents(result || []);
      } catch (err) {
        console.error('Error fetching agents:', err);
        setAgents([]);
      }
    };
    fetchAgents();
  }, [isAuthenticated, selectedBranchId]);

  const setSelectedBranchId = useCallback((id: string | null) => {
    setSelectedBranchIdState(id);
    // Refetch conversations when branch changes
    fetchConversations();
  }, [fetchConversations]);

  const value: RealChatContextType = {
    // Conversations
    conversations,
    selectedConversation,
    setSelectedConversation,
    updateConversationStatus,
    assignConversation,
    transferConversation,
    escalateConversation,
    sendMessage,
    updateNotes,
    getFilteredConversations,
    
    // Branches & Agents
    branches: (branches || []).map(b => ({
      id: b.id,
      name: b.name,
      location: b.location || '',
      activeChats: 0,
      pendingChats: 0,
      unassignedChats: 0,
      agents: (agents || []).filter(a => a.branch_id === b.id).map(a => ({
        id: a.id,
        name: a.name,
        email: a.email || '',
        branchId: b.id,
        status: 'offline' as const,
        activeChats: 0,
        maxChats: 5,
      })),
    })),
    agents: (agents || []).map(a => ({
      id: a.id,
      name: a.name,
      email: a.email || '',
      branchId: a.branch_id || '',
      status: 'offline' as const,
      activeChats: 0,
      maxChats: 5,
    })),
    selectedBranchId,
    setSelectedBranchId,
    getBranchAgents,
    api,
    
    // Tasks - now from real API
    tasks: (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      priority: t.priority || 'normal',
      status: t.status || 'pending',
      assignedTo: t.assigned_to_agent_id || '',
      assignedBy: t.assigned_by_manager_id || '',
      branchId: t.branch_id || '',
      caseId: t.case_id || '',
      dueDate: t.deadline ? new Date(t.deadline) : undefined,
      createdAt: t.created_at ? new Date(t.created_at) : new Date(),
      updatedAt: t.updated_at ? new Date(t.updated_at) : new Date(),
      completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
    })),
    selectedTask: mockContext?.selectedTask || null,
    setSelectedTask: mockContext?.setSelectedTask || (() => {}),
    createTask: async (taskData: any) => {
      try {
        await api.createTask({
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          assigned_to_agent_id: taskData.assignedTo,
          branch_id: taskData.branchId,
          case_id: taskData.caseId,
          deadline: taskData.dueDate?.toISOString(),
        });
        await fetchTasks();
      } catch (err) {
        console.error('Error creating task:', err);
        throw err;
      }
    },
    updateTaskStatus: async (taskId: string, status: TaskStatus) => {
      try {
        await api.updateTask(taskId, { status });
        await fetchTasks();
      } catch (err) {
        console.error('Error updating task:', err);
        throw err;
      }
    },
    assignTask: mockContext?.assignTask || (() => {}),
    getMyTasks: (userId: string) => tasks.filter((t: any) => t.assigned_to_agent_id === userId),
    getPendingTasksCount: (branchId?: string) => {
      return tasks.filter((t: any) => {
        const branchMatch = !branchId || t.branch_id === branchId;
        const statusMatch = t.status === 'pending' || t.status === 'in_progress';
        return branchMatch && statusMatch;
      }).length;
    },
    
    // Reports - now from real API
    reports,
    createReport: async (reportData: any) => {
      try {
        await api.createReport({
          title: reportData.title,
          description: reportData.content || reportData.description,
          urgency: reportData.urgency || 'normal',
          case_id: reportData.caseId,
          branch_id: reportData.branchId,
        });
        await fetchReports();
      } catch (err) {
        console.error('Error creating report:', err);
        throw err;
      }
    },
    updateReportStatus: async (reportId: string, status: any, adminNotes?: string) => {
      try {
        await api.updateReport(reportId, { status, admin_response: adminNotes });
        await fetchReports();
      } catch (err) {
        console.error('Error updating report:', err);
        throw err;
      }
    },
    getBranchReports: (branchId: string) => reports.filter((r: any) => r.branch_id === branchId),
    
    // Notifications
    notifications,
    unreadNotificationsCount: notifications.filter(n => !n.isRead).length,
    markNotificationAsRead: (notificationId) => {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
    },
    markAllNotificationsAsRead: () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    },
    addNotification: (notificationData) => {
      const newNotification: Notification = {
        ...notificationData,
        id: `notif-${Date.now()}`,
        createdAt: new Date(),
      };
      setNotifications(prev => [...prev, newNotification]);
    },
    
    // Analytics
    analyticsData: mockContext?.analyticsData || null,
    adminDashboardStats: mockContext?.adminDashboardStats || null,
    
    // Status
    updateAgentStatus: mockContext?.updateAgentStatus || (async () => {}),
    
    // Real API specific
    loading,
    error,
    refreshConversations: fetchConversations,
    refreshCurrentConversation,
  };

  return (
    // Wrap with both providers - use unknown first for type cast to avoid getBranchAgents mismatch
    <ChatContext.Provider value={value as unknown as ChatContextType}>
      <RealChatContext.Provider value={value}>
        {children}
      </RealChatContext.Provider>
    </ChatContext.Provider>
  );
}

export function useRealChat() {
  const context = useContext(RealChatContext);
  if (context === undefined) {
    throw new Error('useRealChat must be used within a RealChatProvider');
  }
  return context;
}

// Export for components that need to use real API directly
export { apiService };

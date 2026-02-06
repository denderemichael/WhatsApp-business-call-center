/**
 * Hook for using the Mock API Service
 * 
 * This hook provides access to the mock API with automatic context
 * management and user authentication simulation.
 */

import { useState, useEffect, useCallback } from 'react';
import mockApi from '@/services/mockApiService';
import { User, UserRole, Conversation, Branch, Agent, Task, Report, Notification, Escalation, ConversationStatus, TaskStatus, PaginatedResponse, ApiResponse } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface UseMockApiOptions {
  autoLogin?: boolean;
  defaultUserId?: string;
}

export interface UseMockApiReturn {
  // User state
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<ApiResponse<{ user: User; token: string }>>;
  logout: () => Promise<void>;
  
  // Data loading
  isLoading: boolean;
  error: string | null;
  
  // Conversations
  conversations: Conversation[];
  fetchConversations: (filters?: { branchId?: string; agentId?: string; status?: ConversationStatus; page?: number; limit?: number }) => Promise<void>;
  getConversation: (id: string) => Promise<ApiResponse<Conversation>>;
  assignConversation: (conversationId: string, agentId: string) => Promise<ApiResponse<Conversation>>;
  transferConversation: (conversationId: string, agentId: string, reason?: string) => Promise<ApiResponse<Conversation>>;
  escalateConversation: (conversationId: string, level: string, reason: string, description: string) => Promise<ApiResponse<Escalation>>;
  sendMessage: (conversationId: string, content: string, taskId?: string) => Promise<ApiResponse<any>>;
  
  // Branches & Agents
  branches: Branch[];
  agents: Agent[];
  fetchBranches: () => Promise<void>;
  fetchAgents: (filters?: { branchId?: string; status?: string }) => Promise<void>;
  updateAgentStatus: (agentId: string, status: 'online' | 'busy' | 'offline') => Promise<ApiResponse<Agent>>;
  
  // Tasks
  tasks: Task[];
  fetchTasks: (filters?: { agentId?: string; status?: TaskStatus }) => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<ApiResponse<Task>>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<ApiResponse<Task>>;
  
  // Reports
  reports: Report[];
  fetchReports: (filters?: { status?: Report['status'] }) => Promise<void>;
  submitReport: (reportId: string) => Promise<ApiResponse<Report>>;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  
  // Escalations
  escalations: Escalation[];
  fetchEscalations: (filters?: { status?: Escalation['status'] }) => Promise<void>;
  resolveEscalation: (id: string, resolution: string) => Promise<ApiResponse<Escalation>>;
  
  // Sync
  lastSync: Date | null;
  subscribeToSync: (callback: () => void) => () => void;
  
  // Utilities
  clearError: () => void;
  setLatency: (ms: number) => void;
}

// ============================================================================
// Mock Users for Easy Login
// ============================================================================

export const MOCK_USERS = {
  admin: { id: 'admin-1', email: 'admin@whatsapp-hub.com', password: 'any' },
  manager1: { id: 'manager-1', email: 'michael@whatsapp-hub.com', password: 'any' },
  manager2: { id: 'manager-2', email: 'tendai@whatsapp-hub.com', password: 'any' },
  agent1: { id: 'agent-1', email: 'james@whatsapp-hub.com', password: 'any' },
  agent2: { id: 'agent-2', email: 'emily@whatsapp-hub.com', password: 'any' },
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMockApi(options: UseMockApiOptions = {}): UseMockApiReturn {
  const { autoLogin = true, defaultUserId = 'admin-1' } = options;
  
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Data state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Business data
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  
  // Sync state
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Auto-login on mount
  useEffect(() => {
    if (autoLogin && defaultUserId) {
      loginAs(defaultUserId);
    }
  }, [autoLogin, defaultUserId]);
  
  // Login helper
  const loginAs = useCallback(async (userId: string) => {
    const user = MOCK_USERS[userId as keyof typeof MOCK_USERS];
    if (user) {
      await login(user.email);
    }
  }, []);
  
  // -------------------- Authentication --------------------
  
  const login = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await mockApi.login(email, 'any');
      
      if (response.success && response.data) {
        setCurrentUser(response.data.user);
        setIsAuthenticated(true);
        
        // Fetch initial data
        await Promise.all([
          fetchBranches(),
          fetchAgents(),
          fetchConversations(),
          fetchTasks(),
          fetchReports(),
          fetchNotifications(),
          fetchEscalations(),
        ]);
        
        return response;
      } else {
        setError(response.error?.message || 'Login failed');
        return response;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return { success: false, error: { code: 'UNKNOWN_ERROR', message } } as ApiResponse<never>;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const logout = useCallback(async () => {
    await mockApi.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setConversations([]);
    setBranches([]);
    setAgents([]);
    setTasks([]);
    setReports([]);
    setNotifications([]);
    setEscalations([]);
  }, []);
  
  // -------------------- Branches & Agents --------------------
  
  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await mockApi.getBranches();
      if (response.success && response.data) {
        setBranches(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchAgents = useCallback(async (filters?: { branchId?: string; status?: string }) => {
    setIsLoading(true);
    try {
      const response = await mockApi.getAgents(filters);
      if (response.success && response.data) {
        setAgents(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const updateAgentStatus = useCallback(async (agentId: string, status: 'online' | 'busy' | 'offline') => {
    try {
      const response = await mockApi.updateAgent(agentId, { status });
      if (response.success && response.data) {
        setAgents(prev => prev.map(a => a.id === agentId ? response.data! : a));
        return response;
      }
      return response;
    } catch (err) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Failed to update agent status' } } as ApiResponse<never>;
    }
  }, []);
  
  // -------------------- Conversations --------------------
  
  const fetchConversations = useCallback(async (filters?: { branchId?: string; agentId?: string; status?: ConversationStatus; page?: number; limit?: number }) => {
    setIsLoading(true);
    try {
      const response = await mockApi.getConversations(filters);
      if (response.success && response.data) {
        setConversations(response.data.items);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const getConversation = useCallback(async (id: string) => {
    return await mockApi.getConversationById(id);
  }, []);
  
  const assignConversation = useCallback(async (conversationId: string, agentId: string) => {
    const response = await mockApi.assignConversation(conversationId, agentId);
    if (response.success && response.data) {
      setConversations(prev => prev.map(c => c.id === conversationId ? response.data! : c));
    }
    return response;
  }, []);
  
  const transferConversation = useCallback(async (conversationId: string, agentId: string, reason?: string) => {
    const response = await mockApi.transferConversation(conversationId, agentId, reason);
    if (response.success && response.data) {
      setConversations(prev => prev.map(c => c.id === conversationId ? response.data! : c));
    }
    return response;
  }, []);
  
  const escalateConversation = useCallback(async (conversationId: string, level: string, reason: string, description: string) => {
    const response = await mockApi.escalateConversation({
      conversationId,
      level: level as any,
      reason: reason as any,
      description,
    });
    if (response.success && response.data) {
      await fetchEscalations();
    }
    return response;
  }, []);
  
  const sendMessage = useCallback(async (conversationId: string, content: string, taskId?: string) => {
    const response = await mockApi.sendMessage(conversationId, content, taskId);
    if (response.success && response.data) {
      setConversations(prev => prev.map(c => {
        if (c.id === conversationId) {
          return { ...c, messages: [...c.messages, response.data!] };
        }
        return c;
      }));
    }
    return response;
  }, []);
  
  // -------------------- Tasks --------------------
  
  const fetchTasks = useCallback(async (filters?: { agentId?: string; status?: TaskStatus }) => {
    setIsLoading(true);
    try {
      const response = await mockApi.getTasks(filters);
      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const createTask = useCallback(async (taskData: Partial<Task>) => {
    const response = await mockApi.createTask({
      branchId: taskData.branchId!,
      assignedTo: taskData.assignedTo!,
      title: taskData.title!,
      description: taskData.description || '',
      priority: taskData.priority || 'normal',
      conversationId: taskData.conversationId,
      dueDate: taskData.dueDate,
    });
    if (response.success && response.data) {
      setTasks(prev => [response.data!, ...prev]);
    }
    return response;
  }, []);
  
  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    const response = await mockApi.updateTaskStatus(taskId, status);
    if (response.success && response.data) {
      setTasks(prev => prev.map(t => t.id === taskId ? response.data! : t));
    }
    return response;
  }, []);
  
  // -------------------- Reports --------------------
  
  const fetchReports = useCallback(async (filters?: { status?: Report['status'] }) => {
    setIsLoading(true);
    try {
      const response = await mockApi.getReports(filters);
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const submitReport = useCallback(async (reportId: string) => {
    const response = await mockApi.submitReport(reportId);
    if (response.success && response.data) {
      setReports(prev => prev.map(r => r.id === reportId ? response.data! : r));
    }
    return response;
  }, []);
  
  // -------------------- Notifications --------------------
  
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await mockApi.getNotifications();
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);
  
  const markNotificationAsRead = useCallback(async (id: string) => {
    await mockApi.markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);
  
  const markAllAsRead = useCallback(async () => {
    await mockApi.markAllNotificationsAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);
  
  // -------------------- Escalations --------------------
  
  const fetchEscalations = useCallback(async (filters?: { status?: Escalation['status'] }) => {
    try {
      const response = await mockApi.getEscalations(filters);
      if (response.success && response.data) {
        setEscalations(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch escalations:', err);
    }
  }, []);
  
  const resolveEscalation = useCallback(async (id: string, resolution: string) => {
    const response = await mockApi.resolveEscalation(id, resolution);
    if (response.success && response.data) {
      setEscalations(prev => prev.map(e => e.id === id ? response.data! : e));
    }
    return response;
  }, []);
  
  // -------------------- Sync --------------------
  
  const subscribeToSync = useCallback((callback: () => void) => {
    return mockApi.subscribeToSync(() => {
      setLastSync(new Date());
      callback();
    });
  }, []);
  
  // -------------------- Utilities --------------------
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const setLatency = useCallback((ms: number) => {
    mockApi.setLatency(ms);
  }, []);
  
  return {
    // User state
    currentUser,
    isAuthenticated,
    login,
    logout,
    
    // Data loading
    isLoading,
    error,
    
    // Conversations
    conversations,
    fetchConversations,
    getConversation,
    assignConversation,
    transferConversation,
    escalateConversation,
    sendMessage,
    
    // Branches & Agents
    branches,
    agents,
    fetchBranches,
    fetchAgents,
    updateAgentStatus,
    
    // Tasks
    tasks,
    fetchTasks,
    createTask,
    updateTaskStatus,
    
    // Reports
    reports,
    fetchReports,
    submitReport,
    
    // Notifications
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length,
    markNotificationAsRead,
    markAllAsRead,
    
    // Escalations
    escalations,
    fetchEscalations,
    resolveEscalation,
    
    // Sync
    lastSync,
    subscribeToSync,
    
    // Utilities
    clearError,
    setLatency,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default useMockApi;

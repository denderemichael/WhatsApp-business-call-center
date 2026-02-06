import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Conversation, ConversationStatus, Branch, Agent, Task, TaskStatus, TaskPriority, Report, ReportStatus, Notification, AnalyticsData, AdminDashboardStats } from '@/types';
import { mockConversations, mockBranches, mockAgents, mockTasks, mockReports, mockNotifications, mockAnalyticsData, mockAdminDashboardStats } from '@/data/mockData';
import mockApi from '@/services/mockApiService';

interface ChatContextType {
  // Conversations
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation | null) => void;
  updateConversationStatus: (conversationId: string, status: ConversationStatus) => void;
  assignConversation: (conversationId: string, agentId: string) => void;
  transferConversation: (conversationId: string, newAgentId: string) => void;
  escalateConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string, taskId?: string) => void;
  updateNotes: (conversationId: string, notes: string) => void;
  getFilteredConversations: (branchId?: string | null, agentId?: string, status?: string) => Conversation[];
  
  // Branches & Agents
  branches: Branch[];
  agents: Agent[];
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  getBranchAgents: (branchId: string) => Agent[];
  
  // Tasks
  tasks: Task[];
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  assignTask: (taskId: string, agentId: string) => void;
  getMyTasks: (userId: string) => Task[];
  getPendingTasksCount: (branchId?: string) => number;
  
  // Reports
  reports: Report[];
  createReport: (report: Omit<Report, 'id' | 'createdAt'>) => void;
  updateReportStatus: (reportId: string, status: ReportStatus, adminNotes?: string) => void;
  getBranchReports: (branchId: string) => Report[];
  
  // Notifications
  notifications: Notification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  
  // Analytics
  analyticsData: AnalyticsData | null;
  adminDashboardStats: AdminDashboardStats | null;
  
  // Online/Offline Status
  updateAgentStatus: (agentId: string, status: 'online' | 'busy' | 'offline') => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [branches] = useState<Branch[]>(mockBranches);
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [reports, setReports] = useState<Report[]>(mockReports);
  
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  
  const [analyticsData] = useState<AnalyticsData | null>(mockAnalyticsData);
  const [adminDashboardStats] = useState<AdminDashboardStats | null>(mockAdminDashboardStats);

  // Conversation methods
  const updateConversationStatus = useCallback((conversationId: string, status: ConversationStatus) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, status } : conv
      )
    );
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev => prev ? { ...prev, status } : null);
    }
  }, [selectedConversation]);

  const assignConversation = useCallback((conversationId: string, agentId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, assignedAgentId: agentId, status: 'assigned' as ConversationStatus }
          : conv
      )
    );
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev =>
        prev ? { ...prev, assignedAgentId: agentId, status: 'assigned' } : null
      );
    }
  }, [selectedConversation]);

  const escalateConversation = useCallback((conversationId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, status: 'escalated' as ConversationStatus }
          : conv
      )
    );
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev =>
        prev ? { ...prev, status: 'escalated' } : null
      );
    }
    
    // Create notification for admin
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId: 'admin-1',
      type: 'conversation_escalated',
      title: 'Conversation Escalated',
      message: 'A conversation has been escalated and requires attention',
      isRead: false,
      createdAt: new Date(),
      link: `/dashboard?conversation=${conversationId}`,
      metadata: { conversationId },
    };
    setNotifications(prev => [...prev, notification]);
  }, [selectedConversation]);

  const transferConversation = useCallback((conversationId: string, newAgentId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, assignedAgentId: newAgentId, status: 'assigned' as ConversationStatus }
          : conv
      )
    );
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev =>
        prev ? { ...prev, assignedAgentId: newAgentId, status: 'assigned' } : null
      );
    }
    
    // Create notification for new agent
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId: newAgentId,
      type: 'task_assigned',
      title: 'Chat Transferred',
      message: 'A conversation has been transferred to you',
      isRead: false,
      createdAt: new Date(),
      link: `/dashboard?conversation=${conversationId}`,
      metadata: { conversationId },
    };
    setNotifications(prev => [...prev, notification]);
  }, [selectedConversation]);

  const sendMessage = useCallback((conversationId: string, content: string, taskId?: string) => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      content,
      senderId: 'current-agent',
      senderType: 'agent' as const,
      timestamp: new Date(),
      status: 'sent' as const,
      isTaskRelated: !!taskId,
      taskId,
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
      setSelectedConversation(prev =>
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
  }, [selectedConversation]);

  const updateNotes = useCallback((conversationId: string, notes: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, notes } : conv
      )
    );
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev => prev ? { ...prev, notes } : null);
    }
  }, [selectedConversation]);

  const getFilteredConversations = useCallback((branchId?: string | null, agentId?: string, status?: string) => {
    return conversations.filter(conv => {
      if (branchId && conv.branchId !== branchId) return false;
      if (agentId && conv.assignedAgentId !== agentId) return false;
      if (status && status !== 'all' && conv.status !== status) return false;
      return true;
    });
  }, [conversations]);

  // Agent methods
  const getBranchAgents = useCallback((branchId: string) => {
    return agents.filter(a => a.branchId === branchId);
  }, [agents]);

  const updateAgentStatus = useCallback(async (agentId: string, status: 'online' | 'busy' | 'offline') => {
    // Update local state immediately for responsive UI
    setAgents(prev =>
      prev.map(agent =>
        agent.id === agentId ? { ...agent, status } : agent
      )
    );
    
    // Call API to update status and notify managers
    await mockApi.updateAgentStatus(agentId, status);
  }, []);

  // Task methods
  const createTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTasks(prev => [...prev, newTask]);
    
    // Create notification for assigned agent
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId: taskData.assignedTo,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `${taskData.assignedBy === 'current-user' ? 'You have' : 'A manager has'} assigned you a task: ${taskData.title}`,
      isRead: false,
      createdAt: new Date(),
      link: `/dashboard?task=${newTask.id}`,
      metadata: { taskId: newTask.id },
    };
    setNotifications(prev => [...prev, notification]);
  }, []);

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              status,
              updatedAt: new Date(),
              completedAt: status === 'completed' ? new Date() : undefined,
            }
          : task
      )
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev =>
        prev
          ? {
              ...prev,
              status,
              updatedAt: new Date(),
              completedAt: status === 'completed' ? new Date() : undefined,
            }
          : null
      );
    }
  }, [selectedTask]);

  const assignTask = useCallback((taskId: string, agentId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, assignedTo: agentId, status: 'pending' as TaskStatus, updatedAt: new Date() }
          : task
      )
    );
    
    // Create notification for new agent
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId: agentId,
      type: 'task_assigned',
      title: 'Task Reassigned',
      message: 'A manager has reassigned a task to you',
      isRead: false,
      createdAt: new Date(),
      link: `/dashboard?task=${taskId}`,
      metadata: { taskId },
    };
    setNotifications(prev => [...prev, notification]);
  }, []);

  const getMyTasks = useCallback((userId: string) => {
    return tasks.filter(task => task.assignedTo === userId);
  }, [tasks]);

  const getPendingTasksCount = useCallback((branchId?: string) => {
    return tasks.filter(task => {
      const branchMatch = !branchId || task.branchId === branchId;
      const statusMatch = task.status === 'pending' || task.status === 'in_progress';
      return branchMatch && statusMatch;
    }).length;
  }, [tasks]);

  // Report methods
  const createReport = useCallback((reportData: Omit<Report, 'id' | 'createdAt'>) => {
    const newReport: Report = {
      ...reportData,
      id: `report-${Date.now()}`,
      createdAt: new Date(),
    };
    setReports(prev => [...prev, newReport]);
    
    // Notify admin
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId: 'admin-1',
      type: 'report_submitted',
      title: 'New Report Submitted',
      message: `A new ${reportData.reportType} report has been submitted`,
      isRead: false,
      createdAt: new Date(),
      link: `/analytics?report=${newReport.id}`,
      metadata: { reportId: newReport.id, branchId: reportData.branchId },
    };
    setNotifications(prev => [...prev, notification]);
  }, []);

  const updateReportStatus = useCallback((reportId: string, status: ReportStatus, adminNotes?: string) => {
    setReports(prev =>
      prev.map(report =>
        report.id === reportId
          ? {
              ...report,
              status,
              reviewedBy: 'admin-1',
              reviewedAt: new Date(),
              adminNotes,
            }
          : report
      )
    );
  }, []);

  const getBranchReports = useCallback((branchId: string) => {
    return reports.filter(report => report.branchId === branchId);
  }, [reports]);

  // Notification methods
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  }, []);

  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notif-${Date.now()}`,
      createdAt: new Date(),
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
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
        branches,
        agents,
        selectedBranchId,
        setSelectedBranchId,
        getBranchAgents,
        
        // Tasks
        tasks,
        selectedTask,
        setSelectedTask,
        createTask,
        updateTaskStatus,
        assignTask,
        getMyTasks,
        getPendingTasksCount,
        
        // Reports
        reports,
        createReport,
        updateReportStatus,
        getBranchReports,
        
        // Notifications
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,
        
        // Analytics
        analyticsData,
        adminDashboardStats,
        
        // Status
        updateAgentStatus,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

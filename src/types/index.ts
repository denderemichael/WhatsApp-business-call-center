// ============================================================================
// Core Types
// ============================================================================

export type UserRole = 'admin' | 'branch_manager' | 'agent';

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
  avatar?: string;
  status: 'online' | 'busy' | 'offline';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// ============================================================================
// Branch Types
// ============================================================================

export interface Branch {
  id: string;
  name: string;
  location: string;
  whatsappNumber?: string;
  activeChats: number;
  pendingChats: number;
  unassignedChats: number;
  agents: Agent[];
}

// ============================================================================
// Agent Types
// ============================================================================

export interface Agent {
  id: string;
  name: string;
  email: string;
  branchId: string;
  status: 'online' | 'busy' | 'offline';
  activeChats: number;
  maxChats: number;
  avatar?: string;
  skills?: string[];
}

export interface AgentExtended extends Agent {
  activeCaseCount: number;
  maxCases: number;
  currentWorkload: number;
  skills: string[];
  languages: string[];
  performanceScore?: number;
  averageResponseTime?: number;
  averageHandleTime?: number;
  resolvedToday?: number;
  escalatedToday?: number;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: string;
  branchId: string;
  assignedBy: string;
  assignedTo: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  conversationId?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  agentId: string;
  branchManagerId: string;
  assignedAt: Date;
  message?: string;
  isRead: boolean;
}

// ============================================================================
// Conversation Types
// ============================================================================

export type ConversationStatus = 'new' | 'assigned' | 'in_progress' | 'escalated' | 'resolved' | 'closed';
export type ConversationTag = 'Loan' | 'Repayment' | 'Complaint' | 'General' | 'Inquiry' | 'Support';
export type ConversationSource = 'whatsapp' | 'web' | 'api' | 'phone';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderType: 'customer' | 'agent' | 'system';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  isTaskRelated?: boolean;
  taskId?: string;
}

export interface Conversation {
  id: string;
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
  branchId: string;
  assignedAgentId?: string;
  status: ConversationStatus;
  tags: ConversationTag[];
  notes: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
  hasTask: boolean;
  taskId?: string;
  source: ConversationSource;
  createdAt: Date;
}

export interface ConversationDetails extends Omit<Conversation, 'source'> {
  priority: ConversationPriority;
  source: ConversationSource;
  customerId: string;
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
  productType?: string;
  slaTracking?: SLATracking;
  activeEscalation?: Escalation;
  timeline: AuditEvent[];
  metadata?: Record<string, any>;
}

// ============================================================================
// SLA Types
// ============================================================================

export type SLAPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SLAStatus = 'pending' | 'at_risk' | 'breached' | 'resolved' | 'closed';

export interface SLAConfig {
  id: string;
  branchId?: string;
  priority: SLAPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationLevel: number;
}

export interface SLATracking {
  id: string;
  conversationId: string;
  priority: SLAPriority;
  status: SLAStatus;
  responseDueAt: Date;
  resolutionDueAt: Date;
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseBreachedAt?: Date;
  resolutionBreachedAt?: Date;
  lastUpdatedAt: Date;
}

// ============================================================================
// Escalation Types
// ============================================================================

export type EscalationLevel = 'level1' | 'level2' | 'level3' | 'admin';
export type EscalationReason = 'sla_breach' | 'customer_request' | 'complex_issue' | 'complaint' | 'manager_review';
export type EscalationStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

export interface Escalation {
  id: string;
  caseId: string;
  conversationId: string;
  branchId: string;
  level: EscalationLevel;
  reason: EscalationReason;
  description: string;
  escalatedBy: string;
  escalatedAt: Date;
  assignedTo?: string;
  status: EscalationStatus;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Audit Types
// ============================================================================

export type AuditActionType =
  | 'conversation_created'
  | 'conversation_assigned'
  | 'conversation_transferred'
  | 'conversation_escalated'
  | 'conversation_resolved'
  | 'conversation_closed'
  | 'message_sent'
  | 'message_received'
  | 'agent_status_changed'
  | 'task_created'
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'report_created'
  | 'report_submitted'
  | 'report_reviewed'
  | 'sla_breach'
  | 'sla_warning'
  | 'user_login'
  | 'user_logout'
  | 'permission_changed'
  | 'data_exported';

export interface AuditEvent {
  id: string;
  conversationId?: string;
  taskId?: string;
  reportId?: string;
  escalationId?: string;
  actionType: AuditActionType;
  performedBy: string;
  performedAt: Date;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Report Types
// ============================================================================

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ReportFormat = 'summary' | 'detailed' | 'excel' | 'pdf';

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  conversationsHandled: number;
  resolvedConversations: number;
  averageResponseTime: number;
  averageHandleTime: number;
}

export interface ReportMetrics {
  totalConversations: number;
  resolvedConversations: number;
  escalatedConversations: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  customerSatisfaction: number;
  agentPerformance: AgentPerformance[];
}

export interface Report {
  id: string;
  branchId: string;
  submittedBy: string;
  reportType: ReportType;
  title: string;
  content: string;
  status: ReportStatus;
  metrics: ReportMetrics;
  createdAt: Date;
  submittedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  adminNotes?: string;
}

export interface ReportExtended extends Report {
  generatedBy: string;
  dateRange: { start: Date; end: Date };
  filters?: {
    branchId?: string;
    agentId?: string;
    status?: string;
    tags?: string[];
  };
  format: ReportFormat;
  attachments?: string[];
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 'task_assigned' | 'chat_transferred' | 'report_submitted' | 'report_reviewed' | 'conversation_escalated' | 'agent_status_changed';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  link?: string;
  metadata?: Record<string, any>;
}

export interface NotificationExtended extends Notification {
  readAt?: Date;
  actionUrl?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsData {
  branchId?: string;
  dateRange: { start: Date; end: Date };
  metrics: {
    totalConversations: number;
    newConversations: number;
    resolvedConversations: number;
    escalatedConversations: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    customerSatisfaction: number;
  };
  conversationsByStatus: { status: string; count: number }[];
  conversationsByTag: { tag: string; count: number }[];
  agentMetrics: {
    online: number;
    busy: number;
    offline: number;
  };
}

export interface AnalyticsExtended {
  period: { start: Date; end: Date };
  branchId?: string;
  agentId?: string;
  overview: {
    totalConversations: number;
    newConversations: number;
    resolvedConversations: number;
    escalatedConversations: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    avgHandleTime: number;
    customerSatisfaction: number;
    slaCompliance: number;
    slaBreaches: number;
  };
  trends: {
    date: string;
    conversations: number;
    resolved: number;
    responseTime: number;
  }[];
  agentPerformance: {
    agentId: string;
    agentName: string;
    conversations: number;
    resolved: number;
    avgResponseTime: number;
    avgHandleTime: number;
    satisfaction: number;
    escalationRate: number;
  }[];
  tagDistribution: { tag: string; count: number; percentage: number }[];
  peakHours: { hour: number; count: number }[];
}

export interface AdminDashboardStats {
  totalBranches: number;
  totalAgents: number;
  agentsOnline: number;
  agentsOffline: number;
  totalConversationsToday: number;
  pendingReports: number;
  escalatedConversations: number;
}

// ============================================================================
// Dashboard Sync Types
// ============================================================================

export interface DashboardSync {
  lastSyncAt: Date;
  changes: {
    conversations: string[];
    tasks: string[];
    escalations: string[];
    notifications: string[];
  };
  onlineUsers: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Permission Types
// ============================================================================

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'assign' | 'escalate' | 'approve')[];
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete', 'assign', 'escalate', 'approve'] },
  ],
  branch_manager: [
    { resource: 'conversation', actions: ['create', 'read', 'update', 'assign', 'escalate'] },
    { resource: 'task', actions: ['create', 'read', 'update', 'assign'] },
    { resource: 'report', actions: ['create', 'read', 'update', 'approve'] },
    { resource: 'agent', actions: ['read', 'update'] },
    { resource: 'escalation', actions: ['read', 'update'] },
    { resource: 'analytics', actions: ['read'] },
  ],
  agent: [
    { resource: 'conversation', actions: ['read', 'update'] },
    { resource: 'task', actions: ['read', 'update'] },
    { resource: 'message', actions: ['create', 'read'] },
    { resource: 'escalation', actions: ['create', 'read'] },
  ],
};

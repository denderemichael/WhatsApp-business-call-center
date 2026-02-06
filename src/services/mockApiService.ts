/**
 * Mock API Service for WhatsApp Agent Contact Centre Dashboard
 * 
 * A stateful mock backend that simulates real API behavior including:
 * - Agent assignment/reassignment
 * - Escalation handling (auto SLA breach + manual escalation)
 * - Dashboard sync across roles
 * - Analytics and reporting generation
 * - Role-based permission enforcement
 * - Audit logging for all actions
 * - Simulated delays for realism
 */

import {
  User,
  UserRole,
  Agent,
  Branch,
  Conversation,
  ConversationStatus,
  Task,
  TaskStatus,
  TaskPriority,
  Report,
  ReportStatus,
  ReportMetrics,
  Notification,
  Escalation,
  EscalationLevel,
  EscalationReason,
  EscalationStatus,
  AuditEvent,
  AuditActionType,
  SLATracking,
  SLAPriority,
  SLAStatus,
  SLAConfig,
  DashboardSync,
  PaginatedResponse,
  ApiResponse,
  ROLE_PERMISSIONS,
  Permission,
} from '@/types';
import {
  mockUsers,
  mockAgents,
  mockBranches,
  mockConversations,
  mockTasks,
  mockReports,
  mockNotifications,
  mockAdminDashboardStats,
} from '@/data/mockData';

// ============================================================================
// Type Definitions
// ============================================================================

interface RequestContext {
  userId: string;
  userRole: UserRole;
  branchId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Mock API Service Class
// ============================================================================

class MockApiService {
  // In-memory state storage
  private users: User[];
  private agents: Agent[];
  private branches: Branch[];
  private conversations: Conversation[];
  private tasks: Task[];
  private reports: Report[];
  private notifications: Notification[];
  private escalations: Escalation[];
  private auditLogs: AuditEvent[];
  private slaTracking: SLATracking[];
  private slaConfigs: SLAConfig[];
  
  // Dashboard sync state
  private syncSubscribers: Set<(sync: DashboardSync) => void>;
  
  // Simulated latency
  private baseLatencyMs: number;
  private latencyVarianceMs: number;
  
  // Current context
  private currentContext: RequestContext | null;

  constructor() {
    this.users = [...mockUsers];
    this.agents = [...mockAgents];
    this.branches = [...mockBranches];
    this.conversations = [...mockConversations];
    this.tasks = [...mockTasks];
    this.reports = [...mockReports];
    this.notifications = [...mockNotifications];
    this.escalations = [];
    this.auditLogs = [];
    // Initialize configs before tracking (tracking depends on configs)
    this.slaConfigs = this.initializeSLAConfigs();
    this.slaTracking = this.initializeSLATracking();
    
    this.syncSubscribers = new Set();
    this.baseLatencyMs = 100;
    this.latencyVarianceMs = 50;
    this.currentContext = {
      userId: 'admin-1',
      userRole: 'admin',
    };
    
    console.log('[MockAPI] Service initialized');
  }

  // ============================================================================
  // Latency Simulation
  // ============================================================================

  private async simulateLatency(): Promise<void> {
    const latency = this.baseLatencyMs + Math.random() * this.latencyVarianceMs;
    return new Promise(resolve => setTimeout(resolve, latency));
  }

  setLatency(baseMs: number, varianceMs: number = 0): void {
    this.baseLatencyMs = baseMs;
    this.latencyVarianceMs = varianceMs;
  }

  // ============================================================================
  // Context Management
  // ============================================================================

  setContext(context: RequestContext): void {
    this.currentContext = context;
  }

  clearContext(): void {
    this.currentContext = null;
  }

  private getContext(): RequestContext {
    if (!this.currentContext) {
      throw new Error('No authenticated context');
    }
    return this.currentContext;
  }

  // ============================================================================
  // Permission Checking
  // ============================================================================

  private hasPermission(resource: string, action: string): boolean {
    const context = this.getContext();
    const permissions = ROLE_PERMISSIONS[context.userRole];
    
    return permissions.some(
      (p: Permission) =>
        (p.resource === '*' || p.resource === resource) &&
        p.actions.includes(action as Permission['actions'][number])
    );
  }

  protected requirePermission(resource: string, action: string): void {
    if (!this.hasPermission(resource, action)) {
      throw new Error(`Permission denied: ${action} on ${resource}`);
    }
  }

  // ============================================================================
  // Audit Logging
  // ============================================================================

  private logAudit(
    actionType: AuditActionType,
    conversationId?: string,
    metadata?: Record<string, any>,
    taskId?: string,
    reportId?: string,
    escalationId?: string
  ): AuditEvent {
    const context = this.getContext();
    const event: AuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      taskId,
      reportId,
      escalationId,
      actionType,
      performedBy: context.userId,
      performedAt: new Date(),
      metadata,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
    
    this.auditLogs.unshift(event);
    
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(0, 10000);
    }
    
    console.log(`[Audit] ${actionType} by ${context.userId}`, { conversationId, metadata });
    return event;
  }

  getAuditLogs(filters?: {
    conversationId?: string;
    userId?: string;
    actionType?: AuditActionType;
    limit?: number;
  }): AuditEvent[] {
    let logs = [...this.auditLogs];
    
    if (filters?.conversationId) {
      logs = logs.filter(l => l.conversationId === filters.conversationId);
    }
    if (filters?.userId) {
      logs = logs.filter(l => l.performedBy === filters.userId);
    }
    if (filters?.actionType) {
      logs = logs.filter(l => l.actionType === filters.actionType);
    }
    
    logs.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
    
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }
    
    return logs;
  }

  // ============================================================================
  // SLA Management
  // ============================================================================

  private initializeSLAConfigs(): SLAConfig[] {
    return [
      { id: 'sla-low', branchId: undefined, priority: 'low', responseTimeMinutes: 60, resolutionTimeMinutes: 480, escalationLevel: 1 },
      { id: 'sla-normal', branchId: undefined, priority: 'normal', responseTimeMinutes: 30, resolutionTimeMinutes: 240, escalationLevel: 1 },
      { id: 'sla-high', branchId: undefined, priority: 'high', responseTimeMinutes: 15, resolutionTimeMinutes: 120, escalationLevel: 2 },
      { id: 'sla-urgent', branchId: undefined, priority: 'urgent', responseTimeMinutes: 5, resolutionTimeMinutes: 60, escalationLevel: 3 },
    ];
  }

  private initializeSLATracking(): SLATracking[] {
    return this.conversations.map(conv => {
      const priority: SLAPriority = conv.status === 'escalated' ? 'urgent' : 'normal';
      const config = this.slaConfigs.find(c => c.priority === priority)!;
      const now = new Date();
      
      return {
        id: `sla-${conv.id}`,
        conversationId: conv.id,
        priority,
        status: 'pending' as SLAStatus,
        responseDueAt: new Date(now.getTime() + config.responseTimeMinutes * 60000),
        resolutionDueAt: new Date(now.getTime() + config.resolutionTimeMinutes * 60000),
        responseBreached: false,
        resolutionBreached: false,
        lastUpdatedAt: now,
      };
    });
  }

  private createNotificationInternal(data: {
    userId: string;
    type: Notification['type'];
    title: string;
    message: string;
    isRead: boolean;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    metadata?: Record<string, any>;
    link?: string;
  }): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: data.isRead,
      createdAt: new Date(),
      link: data.link,
      metadata: data.metadata,
    };
    
    this.notifications.unshift(notification);
    this.notifySyncChange();
    return notification;
  }

  private getBranchManagerId(branchId: string): string {
    const manager = this.users.find(u => u.role === 'branch_manager' && u.branchId === branchId);
    return manager?.id || 'admin-1';
  }

  // ============================================================================
  // Dashboard Sync
  // ============================================================================

  subscribeToSync(callback: (sync: DashboardSync) => void): () => void {
    this.syncSubscribers.add(callback);
    return () => this.syncSubscribers.delete(callback);
  }

  private notifySyncChange(): void {
    const sync: DashboardSync = {
      lastSyncAt: new Date(),
      changes: {
        conversations: this.conversations.slice(0, 10).map(c => c.id),
        tasks: this.tasks.slice(0, 10).map(t => t.id),
        escalations: this.escalations.slice(0, 10).map(e => e.id),
        notifications: this.notifications.slice(0, 10).map(n => n.id),
      },
      onlineUsers: this.agents.filter(a => a.status === 'online').map(a => a.id),
    };
    
    this.syncSubscribers.forEach(callback => callback(sync));
  }

  // ============================================================================
  // API Endpoints
  // ============================================================================

  // -------------------- Authentication --------------------

  async login(email: string, _password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    await this.simulateLatency();
    
    const user = this.users.find(u => u.email === email);
    if (!user) {
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
    }
    
    this.setContext({
      userId: user.id,
      userRole: user.role,
      branchId: user.branchId,
    });
    
    return {
      success: true,
      data: {
        user,
        token: `mock-token-${user.id}-${Date.now()}`,
      },
    };
  }

  async logout(): Promise<ApiResponse<void>> {
    await this.simulateLatency();
    this.clearContext();
    return { success: true };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    await this.simulateLatency();
    const context = this.getContext();
    const user = this.users.find(u => u.id === context.userId);
    
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } };
    }
    
    return { success: true, data: user };
  }

  // -------------------- Users --------------------

  async getUsers(filters?: { role?: UserRole }): Promise<ApiResponse<User[]>> {
    await this.simulateLatency();
    this.requirePermission('user', 'read');
    
    let users = [...this.users];
    
    if (filters?.role) {
      users = users.filter(u => u.role === filters.role);
    }
    
    return { success: true, data: users };
  }

  // -------------------- Branches --------------------

  async getBranches(): Promise<ApiResponse<Branch[]>> {
    await this.simulateLatency();
    
    const context = this.getContext();
    let branches = [...this.branches];
    
    if (context.userRole === 'branch_manager') {
      branches = branches.filter(b => b.id === context.branchId);
    }
    
    branches = branches.map(branch => ({
      ...branch,
      activeChats: this.conversations.filter(c => c.branchId === branch.id && c.status !== 'closed' && c.status !== 'resolved').length,
      pendingChats: this.conversations.filter(c => c.branchId === branch.id && c.status === 'new').length,
      unassignedChats: this.conversations.filter(c => c.branchId === branch.id && !c.assignedAgentId && c.status !== 'closed').length,
    }));
    
    return { success: true, data: branches };
  }

  // -------------------- Agents --------------------

  async getAgents(filters?: { branchId?: string; status?: string }): Promise<ApiResponse<Agent[]>> {
    await this.simulateLatency();
    
    const context = this.getContext();
    let agents = [...this.agents];
    
    if (context.userRole === 'branch_manager') {
      agents = agents.filter(a => a.branchId === context.branchId);
    }
    
    if (filters?.branchId) {
      agents = agents.filter(a => a.branchId === filters.branchId);
    }
    if (filters?.status) {
      agents = agents.filter(a => a.status === filters.status);
    }
    
    return { success: true, data: agents };
  }

  async getAgentById(agentId: string): Promise<ApiResponse<Agent>> {
    await this.simulateLatency();
    
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) {
      return { success: false, error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' } };
    }
    
    return { success: true, data: agent };
  }

  async updateAgent(agentId: string, updates: Partial<Agent>): Promise<ApiResponse<Agent>> {
    await this.simulateLatency();
    this.requirePermission('agent', 'update');
    
    const agentIndex = this.agents.findIndex(a => a.id === agentId);
    if (agentIndex === -1) {
      return { success: false, error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' } };
    }
    
    const oldStatus = this.agents[agentIndex].status;
    this.agents[agentIndex] = { ...this.agents[agentIndex], ...updates };
    
    // Update user status as well
    const userIndex = this.users.findIndex(u => u.id === agentId);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], ...updates };
    }
    
    // If status changed, notify the branch manager
    if (updates.status && updates.status !== oldStatus) {
      const agent = this.agents[agentIndex];
      const managerId = this.getBranchManagerId(agent.branchId);
      
      this.createNotificationInternal({
        userId: managerId,
        type: 'agent_status_changed',
        title: 'Agent Status Changed',
        message: `${agent.name || 'An agent'} is now ${updates.status}`,
        isRead: false,
        priority: 'normal',
        metadata: { agentId, agentName: agent.name, oldStatus, newStatus: updates.status },
      });
    }
    
    this.logAudit('agent_status_changed', undefined, { agentId, updates });
    this.notifySyncChange();
    
    return { success: true, data: this.agents[agentIndex] };
  }

  async updateAgentStatus(agentId: string, status: 'online' | 'busy' | 'offline'): Promise<ApiResponse<Agent>> {
    return this.updateAgent(agentId, { status });
  }

  async reassignAgent(agentId: string, newBranchId: string): Promise<ApiResponse<Agent>> {
    await this.simulateLatency();
    this.requirePermission('agent', 'update');
    
    const agentIndex = this.agents.findIndex(a => a.id === agentId);
    if (agentIndex === -1) {
      return { success: false, error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' } };
    }
    
    const oldBranchId = this.agents[agentIndex].branchId;
    this.agents[agentIndex].branchId = newBranchId;
    
    const userIndex = this.users.findIndex(u => u.id === agentId);
    if (userIndex !== -1) {
      this.users[userIndex].branchId = newBranchId;
    }
    
    this.logAudit('agent_status_changed', undefined, { agentId, oldBranchId, newBranchId, action: 'reassign' });
    this.notifySyncChange();
    
    return { success: true, data: this.agents[agentIndex] };
  }

  // -------------------- Conversations --------------------

  async getConversations(filters?: {
    branchId?: string;
    agentId?: string;
    status?: ConversationStatus;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Conversation>>> {
    await this.simulateLatency();
    this.requirePermission('conversation', 'read');
    
    const context = this.getContext();
    let conversations = [...this.conversations];
    
    if (context.userRole === 'branch_manager') {
      conversations = conversations.filter(c => c.branchId === context.branchId);
    }
    if (context.userRole === 'agent') {
      conversations = conversations.filter(c => c.assignedAgentId === context.userId);
    }
    
    if (filters?.branchId) {
      conversations = conversations.filter(c => c.branchId === filters.branchId);
    }
    if (filters?.agentId) {
      conversations = conversations.filter(c => c.assignedAgentId === filters.agentId);
    }
    if (filters?.status) {
      conversations = conversations.filter(c => c.status === filters.status);
    }
    
    conversations.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
    
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const total = conversations.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = conversations.slice(start, start + limit);
    
    return {
      success: true,
      data: { items, total, page, limit, totalPages },
      metadata: { page, limit, total, hasMore: page < totalPages },
    };
  }

  async getConversationById(conversationId: string): Promise<ApiResponse<Conversation>> {
    await this.simulateLatency();
    this.requirePermission('conversation', 'read');
    
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      return { success: false, error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' } };
    }
    
    return { success: true, data: conversation };
  }

  async createConversation(data: {
    customerPhone: string;
    customerName: string;
    branchId: string;
    tags: string[];
  }): Promise<ApiResponse<Conversation>> {
    await this.simulateLatency();
    this.requirePermission('conversation', 'create');
    
    const now = new Date();
    const conversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerPhone: data.customerPhone,
      customerName: data.customerName,
      branchId: data.branchId,
      status: 'new',
      tags: data.tags as Conversation['tags'],
      notes: '',
      lastMessage: '',
      lastMessageTime: now,
      unreadCount: 1,
      messages: [],
      hasTask: false,
      source: 'whatsapp',
      createdAt: now,
    };
    
    this.conversations.unshift(conversation);
    
    this.logAudit('conversation_created', conversation.id, {
      customerPhone: data.customerPhone,
      customerName: data.customerName,
    });
    
    this.notifySyncChange();
    return { success: true, data: conversation };
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<ApiResponse<Conversation>> {
    await this.simulateLatency();
    this.requirePermission('conversation', 'update');
    
    const convIndex = this.conversations.findIndex(c => c.id === conversationId);
    if (convIndex === -1) {
      return { success: false, error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' } };
    }
    
    const oldStatus = this.conversations[convIndex].status;
    this.conversations[convIndex] = { ...this.conversations[convIndex], ...updates };
    
    if (updates.status && updates.status !== oldStatus) {
      this.logAudit('conversation_created', conversationId, { oldStatus, newStatus: updates.status });
    }
    
    this.notifySyncChange();
    return { success: true, data: this.conversations[convIndex] };
  }

  async assignConversation(conversationId: string, agentId: string): Promise<ApiResponse<Conversation>> {
    await this.simulateLatency();
    this.requirePermission('conversation', 'assign');
    
    const convIndex = this.conversations.findIndex(c => c.id === conversationId);
    if (convIndex === -1) {
      return { success: false, error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' } };
    }
    
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) {
      return { success: false, error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' } };
    }
    
    const agentWorkload = this.conversations.filter(
      c => c.assignedAgentId === agentId && c.status !== 'closed' && c.status !== 'resolved'
    ).length;
    
    if (agentWorkload >= agent.maxChats) {
      return { success: false, error: { code: 'AGENT_AT_CAPACITY', message: 'Agent has reached maximum chat capacity' } };
    }
    
    this.conversations[convIndex] = {
      ...this.conversations[convIndex],
      assignedAgentId: agentId,
      status: 'assigned',
    };
    
    this.logAudit('conversation_assigned', conversationId, { agentId });
    
    this.createNotificationInternal({
      userId: agentId,
      type: 'task_assigned',
      title: 'New Conversation Assigned',
      message: `You have been assigned a new conversation with ${this.conversations[convIndex].customerName}`,
      isRead: false,
      priority: 'normal',
      link: `/dashboard?conversation=${conversationId}`,
      metadata: { conversationId },
    });
    
    this.notifySyncChange();
    return { success: true, data: this.conversations[convIndex] };
  }

  async transferConversation(conversationId: string, newAgentId: string, reason?: string): Promise<ApiResponse<Conversation>> {
    await this.simulateLatency();
    this.requirePermission('conversation', 'assign');
    
    const convIndex = this.conversations.findIndex(c => c.id === conversationId);
    if (convIndex === -1) {
      return { success: false, error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' } };
    }
    
    const oldAgentId = this.conversations[convIndex].assignedAgentId;
    
    this.conversations[convIndex] = {
      ...this.conversations[convIndex],
      assignedAgentId: newAgentId,
      status: 'assigned',
    };
    
    this.logAudit('conversation_transferred', conversationId, { fromAgentId: oldAgentId, toAgentId: newAgentId, reason });
    
    this.createNotificationInternal({
      userId: newAgentId,
      type: 'task_assigned',
      title: 'Chat Transferred',
      message: 'A conversation has been transferred to you',
      isRead: false,
      priority: 'normal',
      link: `/dashboard?conversation=${conversationId}`,
      metadata: { conversationId },
    });
    
    this.notifySyncChange();
    return { success: true, data: this.conversations[convIndex] };
  }

  async escalateConversation(data: {
    conversationId: string;
    level: EscalationLevel;
    reason: EscalationReason;
    description: string;
    assignedTo?: string;
  }): Promise<ApiResponse<Escalation>> {
    await this.simulateLatency();
    this.requirePermission('escalation', 'create');
    
    const conversation = this.conversations.find(c => c.id === data.conversationId);
    if (!conversation) {
      return { success: false, error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' } };
    }
    
    const context = this.getContext();
    
    const escalation: Escalation = {
      id: `esc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      caseId: `case-${data.conversationId}`,
      conversationId: data.conversationId,
      branchId: conversation.branchId,
      level: data.level,
      reason: data.reason,
      description: data.description,
      escalatedBy: context.userId,
      escalatedAt: new Date(),
      assignedTo: data.assignedTo,
      status: 'pending',
    };
    
    this.escalations.unshift(escalation);
    
    const convIndex = this.conversations.findIndex(c => c.id === data.conversationId);
    this.conversations[convIndex].status = 'escalated';
    
    this.logAudit('conversation_escalated', data.conversationId, {
      escalationId: escalation.id,
      level: data.level,
      reason: data.reason,
    });
    
    const notifyUserId = data.assignedTo || this.getBranchManagerId(conversation.branchId);
    this.createNotificationInternal({
      userId: notifyUserId,
      type: 'conversation_escalated',
      title: 'Conversation Escalated',
      message: `A conversation has been escalated: ${data.description}`,
      isRead: false,
      priority: 'high',
      link: `/dashboard?conversation=${data.conversationId}`,
      metadata: { conversationId: data.conversationId, escalationId: escalation.id },
    });
    
    this.notifySyncChange();
    return { success: true, data: escalation };
  }

  async resolveEscalation(escalationId: string, resolution: string): Promise<ApiResponse<Escalation>> {
    await this.simulateLatency();
    this.requirePermission('escalation', 'update');
    
    const escIndex = this.escalations.findIndex(e => e.id === escalationId);
    if (escIndex === -1) {
      return { success: false, error: { code: 'ESCALATION_NOT_FOUND', message: 'Escalation not found' } };
    }
    
    const context = this.getContext();
    this.escalations[escIndex] = {
      ...this.escalations[escIndex],
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: context.userId,
      resolution,
    };
    
    const convIndex = this.conversations.findIndex(c => c.id === this.escalations[escIndex].conversationId);
    if (convIndex !== -1) {
      this.conversations[convIndex].status = 'in_progress';
    }
    
    this.logAudit('conversation_escalated', this.escalations[escIndex].conversationId, {
      escalationId,
      action: 'resolved',
      resolution,
    });
    
    this.notifySyncChange();
    return { success: true, data: this.escalations[escIndex] };
  }

  async getEscalations(filters?: {
    status?: EscalationStatus;
    level?: EscalationLevel;
  }): Promise<ApiResponse<Escalation[]>> {
    await this.simulateLatency();
    this.requirePermission('escalation', 'read');
    
    const context = this.getContext();
    let escalations = [...this.escalations];
    
    if (context.userRole === 'branch_manager') {
      escalations = escalations.filter(e => e.branchId === context.branchId);
    }
    
    if (filters?.status) {
      escalations = escalations.filter(e => e.status === filters.status);
    }
    if (filters?.level) {
      escalations = escalations.filter(e => e.level === filters.level);
    }
    
    escalations.sort((a, b) => b.escalatedAt.getTime() - a.escalatedAt.getTime());
    
    return { success: true, data: escalations };
  }

  // -------------------- Messages --------------------

  async sendMessage(conversationId: string, content: string, taskId?: string): Promise<ApiResponse<Conversation['messages'][0]>> {
    await this.simulateLatency();
    this.requirePermission('message', 'create');
    
    const context = this.getContext();
    const convIndex = this.conversations.findIndex(c => c.id === conversationId);
    if (convIndex === -1) {
      return { success: false, error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' } };
    }
    
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      content,
      senderId: context.userId,
      senderType: 'agent' as const,
      timestamp: new Date(),
      status: 'sent' as const,
      isTaskRelated: !!taskId,
      taskId,
    };
    
    this.conversations[convIndex].messages.push(message);
    this.conversations[convIndex].lastMessage = content;
    this.conversations[convIndex].lastMessageTime = new Date();
    
    this.logAudit('message_sent', conversationId, { messageId: message.id, contentLength: content.length });
    this.simulateCustomerResponse(conversationId);
    
    return { success: true, data: message };
  }

  private simulateCustomerResponse(conversationId: string): void {
    setTimeout(() => {
      const responses = [
        'Thank you for your help!',
        'I understand, let me think about it.',
        'That sounds good, please proceed.',
        'Can you explain more about this?',
        'Alright, I will wait for your update.',
      ];
      
      const convIndex = this.conversations.findIndex(c => c.id === conversationId);
      if (convIndex === -1 || this.conversations[convIndex].status === 'closed') return;
      
      const responseMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        content: responses[Math.floor(Math.random() * responses.length)],
        senderId: `customer-${conversationId.split('-')[1]}`,
        senderType: 'customer' as const,
        timestamp: new Date(),
        status: 'delivered' as const,
      };
      
      this.conversations[convIndex].messages.push(responseMessage);
      this.conversations[convIndex].lastMessage = responseMessage.content;
      this.conversations[convIndex].lastMessageTime = new Date();
      this.conversations[convIndex].unreadCount++;
      
      this.logAudit('message_received', conversationId, { messageId: responseMessage.id });
      this.notifySyncChange();
    }, 5000 + Math.random() * 10000);
  }

  // -------------------- Tasks --------------------

  async getTasks(filters?: {
    agentId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
  }): Promise<ApiResponse<Task[]>> {
    await this.simulateLatency();
    this.requirePermission('task', 'read');
    
    const context = this.getContext();
    let tasks = [...this.tasks];
    
    if (context.userRole === 'agent') {
      tasks = tasks.filter(t => t.assignedTo === context.userId);
    }
    
    if (filters?.agentId) {
      tasks = tasks.filter(t => t.assignedTo === filters.agentId);
    }
    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters?.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }
    
    tasks.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return 0;
    });
    
    return { success: true, data: tasks };
  }

  async createTask(data: {
    branchId: string;
    assignedTo: string;
    title: string;
    description: string;
    priority: TaskPriority;
    conversationId?: string;
    dueDate?: Date;
  }): Promise<ApiResponse<Task>> {
    await this.simulateLatency();
    this.requirePermission('task', 'create');
    
    const context = this.getContext();
    const now = new Date();
    
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      branchId: data.branchId,
      assignedBy: context.userId,
      assignedTo: data.assignedTo,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: 'pending',
      conversationId: data.conversationId,
      dueDate: data.dueDate,
      createdAt: now,
      updatedAt: now,
    };
    
    this.tasks.unshift(task);
    
    this.logAudit('task_created', data.conversationId, { taskId: task.id, assignedTo: data.assignedTo });
    
    this.createNotificationInternal({
      userId: data.assignedTo,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${data.title}`,
      isRead: false,
      priority: data.priority === 'urgent' || data.priority === 'high' ? 'high' : 'normal',
      link: `/dashboard?task=${task.id}`,
      metadata: { taskId: task.id },
    });
    
    this.notifySyncChange();
    return { success: true, data: task };
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<ApiResponse<Task>> {
    await this.simulateLatency();
    this.requirePermission('task', 'update');
    
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } };
    }
    
    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      status,
      updatedAt: new Date(),
      completedAt: status === 'completed' ? new Date() : undefined,
    };
    
    const auditAction: AuditActionType = status === 'completed' ? 'task_completed' : 'task_updated';
    this.logAudit(auditAction, undefined, { taskId, status });
    
    this.notifySyncChange();
    return { success: true, data: this.tasks[taskIndex] };
  }

  async assignTask(taskId: string, agentId: string): Promise<ApiResponse<Task>> {
    await this.simulateLatency();
    this.requirePermission('task', 'assign');
    
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } };
    }
    
    const oldAgentId = this.tasks[taskIndex].assignedTo;
    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      assignedTo: agentId,
      status: 'pending',
      updatedAt: new Date(),
    };
    
    this.logAudit('task_assigned', undefined, { taskId, fromAgentId: oldAgentId, toAgentId: agentId });
    
    this.createNotificationInternal({
      userId: agentId,
      type: 'task_assigned',
      title: 'Task Reassigned',
      message: `Task "${this.tasks[taskIndex].title}" has been reassigned to you`,
      isRead: false,
      priority: 'normal',
      link: `/dashboard?task=${taskId}`,
      metadata: { taskId, fromAgentId: oldAgentId },
    });
    
    this.notifySyncChange();
    return { success: true, data: this.tasks[taskIndex] };
  }

  // -------------------- Reports --------------------

  async getReports(filters?: {
    status?: ReportStatus;
  }): Promise<ApiResponse<Report[]>> {
    await this.simulateLatency();
    this.requirePermission('report', 'read');
    
    const context = this.getContext();
    let reports = [...this.reports];
    
    if (context.userRole === 'branch_manager') {
      reports = reports.filter(r => r.submittedBy === context.userId);
    }
    
    if (filters?.status) {
      reports = reports.filter(r => r.status === filters.status);
    }
    
    reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return { success: true, data: reports };
  }

  async createReport(data: {
    branchId: string;
    reportType: Report['reportType'];
    title: string;
    content: string;
    metrics: ReportMetrics;
  }): Promise<ApiResponse<Report>> {
    await this.simulateLatency();
    this.requirePermission('report', 'create');
    
    const context = this.getContext();
    const report: Report = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      branchId: data.branchId,
      submittedBy: context.userId,
      reportType: data.reportType,
      title: data.title,
      content: data.content,
      status: 'draft',
      metrics: data.metrics,
      createdAt: new Date(),
    };
    
    this.reports.unshift(report);
    this.logAudit('report_created', undefined, { reportId: report.id, reportType: data.reportType });
    this.notifySyncChange();
    
    return { success: true, data: report };
  }

  async submitReport(reportId: string): Promise<ApiResponse<Report>> {
    await this.simulateLatency();
    this.requirePermission('report', 'update');
    
    const reportIndex = this.reports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) {
      return { success: false, error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' } };
    }
    
    this.reports[reportIndex] = {
      ...this.reports[reportIndex],
      status: 'submitted',
      submittedAt: new Date(),
    };
    
    this.logAudit('report_submitted', undefined, { reportId });
    
    this.createNotificationInternal({
      userId: 'admin-1',
      type: 'report_submitted',
      title: 'Report Submitted',
      message: `A ${this.reports[reportIndex].reportType} report has been submitted`,
      isRead: false,
      priority: 'normal',
      link: `/reports?report=${reportId}`,
      metadata: { reportId, branchId: this.reports[reportIndex].branchId },
    });
    
    this.notifySyncChange();
    return { success: true, data: this.reports[reportIndex] };
  }

  async reviewReport(reportId: string, status: 'approved' | 'rejected', adminNotes?: string): Promise<ApiResponse<Report>> {
    await this.simulateLatency();
    this.requirePermission('report', 'approve');
    
    const context = this.getContext();
    const reportIndex = this.reports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) {
      return { success: false, error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' } };
    }
    
    this.reports[reportIndex] = {
      ...this.reports[reportIndex],
      status,
      reviewedBy: context.userId,
      reviewedAt: new Date(),
      adminNotes,
    };
    
    this.logAudit('report_reviewed', undefined, { reportId, status, adminNotes });
    
    this.createNotificationInternal({
      userId: this.reports[reportIndex].submittedBy,
      type: 'report_reviewed',
      title: status === 'approved' ? 'Report Approved' : 'Report Rejected',
      message: `Your report "${this.reports[reportIndex].title}" has been ${status}`,
      isRead: false,
      priority: 'normal',
      link: `/reports?report=${reportId}`,
      metadata: { reportId, status, adminNotes },
    });
    
    this.notifySyncChange();
    return { success: true, data: this.reports[reportIndex] };
  }

  // -------------------- Analytics --------------------

  async getAdminDashboardStats(): Promise<ApiResponse<typeof mockAdminDashboardStats>> {
    await this.simulateLatency();
    this.requirePermission('*', 'read');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      success: true,
      data: {
        ...mockAdminDashboardStats,
        totalConversationsToday: this.conversations.filter(c => c.createdAt >= today).length,
        escalatedConversations: this.conversations.filter(c => c.status === 'escalated').length,
      },
    };
  }

  // -------------------- Notifications --------------------

  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    await this.simulateLatency();
    
    const context = this.getContext();
    const notifications = this.notifications.filter(n => n.userId === context.userId);
    
    return { success: true, data: notifications };
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    await this.simulateLatency();
    
    const notifIndex = this.notifications.findIndex(n => n.id === notificationId);
    if (notifIndex !== -1) {
      this.notifications[notifIndex].isRead = true;
    }
    
    return { success: true };
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    await this.simulateLatency();
    
    const context = this.getContext();
    this.notifications = this.notifications.map(n =>
      n.userId === context.userId ? { ...n, isRead: true } : n
    );
    
    return { success: true };
  }

  // -------------------- Health Check --------------------

  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: Date }>> {
    await this.simulateLatency();
    
    return {
      success: true,
      data: { status: 'healthy', timestamp: new Date() },
    };
  }

  // -------------------- Statistics --------------------

  async getConversationStats(): Promise<ApiResponse<{
    total: number;
    byStatus: Record<ConversationStatus, number>;
    averageResponseTime: number;
    slaCompliance: number;
  }>> {
    await this.simulateLatency();
    
    const byStatus: Record<string, number> = {
      new: 0,
      assigned: 0,
      in_progress: 0,
      escalated: 0,
      resolved: 0,
      closed: 0,
    };
    
    this.conversations.forEach(c => {
      byStatus[c.status]++;
    });
    
    const total = this.conversations.length;
    const breached = this.slaTracking.filter(t => t.responseBreached || t.resolutionBreached).length;
    
    return {
      success: true,
      data: {
        total,
        byStatus: byStatus as Record<ConversationStatus, number>,
        averageResponseTime: 2.5,
        slaCompliance: total > 0 ? ((total - breached) / total) * 100 : 100,
      },
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const mockApi = new MockApiService();
export default mockApi;

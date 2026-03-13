/**
 * Real Backend API Service
 * 
 * Connects frontend to the backend
 * 
 * For local development (npm run dev): Uses Vite proxy to Express server on port 3000
 * For production (Vercel): Uses relative paths /api/* to Vercel serverless functions
 * 
 * The Vite proxy configuration (vite.config.ts) maps /api/* to localhost:3000
 * In production, /api/* is handled by Vercel's serverless functions
 */

import { Report, ReportStatus, Task, User } from '../types/index';

// Use environment variable, fallback to relative paths
// In development: Vite proxy handles /api/* -> localhost:3000
// In production: Relative paths work with Vercel serverless functions
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Types matching backend
interface Case {
  id: string;
  customer_phone: string;
  customer_name?: string;
  branch_id?: string;
  assigned_agent_id?: string;
  status: 'new' | 'open' | 'assigned' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  first_message?: string;
  last_message?: string;
  created_at: string;
  updated_at: string;
  branch?: { id: string; name: string };
  customer?: { id: string; phone: string; name?: string };
  assigned_agent?: { id: string; name: string; email: string };
  message_count?: number;
}

interface Message {
  id: string;
  case_id: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_id?: string;
  message_text: string;
  message_type: 'text' | 'image' | 'document' | 'system' | 'template';
  metadata?: Record<string, unknown>;
  created_at: string;
  sender?: { id: string; name: string; role: string };
}

interface Branch {
  id: string;
  name: string;
  location?: string;
  whatsapp_number?: string;
}

interface CaseFilters {
  status?: string;
  branch_id?: string;
  assigned_agent_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

class ApiService {
  private token: string | null = null;

  /**
   * Set auth token for requests
   */
  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Build full URL: API_BASE_URL (from env) + endpoint
    // In production: API_BASE_URL = '' (relative path)
    // In development: API_BASE_URL can be set to http://localhost:3000 or let Vite proxy handle it
    const baseUrl = API_BASE_URL || '';
    const url = endpoint.startsWith('/api') ? `${baseUrl}${endpoint}` : `${baseUrl}/api${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ==================== CASES ====================

  /**
   * Get all cases with optional filters
   */
  async getCases(filters?: CaseFilters): Promise<{ cases: Case[]; total: number }> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.assigned_agent_id) params.append('assigned_agent_id', filters.assigned_agent_id);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const query = params.toString();
    return this.fetch(`/cases${query ? `?${query}` : ''}`);
  }

  /**
   * Get unassigned cases (for manager dashboard)
   */
  async getUnassignedCases(branchId?: string): Promise<Case[]> {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.fetch(`/cases/pending${params}`);
  }

  /**
   * Get single case by ID
   */
  async getCase(caseId: string): Promise<Case> {
    return this.fetch(`/cases/${caseId}`);
  }

  /**
   * Create a new case (manual)
   */
  async createCase(data: {
    customer_phone: string;
    customer_name?: string;
    branch_id?: string;
  }): Promise<Case> {
    return this.fetch('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update case status
   */
  async updateCase(caseId: string, data: {
    status?: Case['status'];
    branch_id?: string;
    priority?: Case['priority'];
  }): Promise<Case> {
    return this.fetch(`/cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Assign agent to case (manager only)
   */
  async assignAgent(caseId: string, agentId: string): Promise<Case> {
    return this.fetch(`/cases/${caseId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId }),
    });
  }

  /**
   * Get case audit logs
   */
  async getCaseLogs(caseId: string): Promise<unknown[]> {
    return this.fetch(`/cases/${caseId}/logs`);
  }

  // ==================== MESSAGES ====================

  /**
   * Get messages for a case
   */
  async getMessages(caseId: string, limit?: number, offset?: number): Promise<Message[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    if (offset) params.append('offset', String(offset));
    
    const query = params.toString();
    return this.fetch(`/messages/case/${caseId}${query ? `?${query}` : ''}`);
  }

  /**
   * Send a message to customer
   */
  async sendMessage(caseId: string, messageText: string): Promise<{
    success: boolean;
    message: Message;
    whatsapp_message_id?: string;
  }> {
    return this.fetch('/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        case_id: caseId,
        message_text: messageText,
        message_type: 'text',
      }),
    });
  }

  /**
   * Get recent messages (manager only)
   */
  async getRecentMessages(limit?: number): Promise<Message[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.fetch(`/messages/recent${params}`);
  }

  // ==================== USERS ====================

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    return this.fetch('/users/me');
  }

  /**
   * Get all branches
   */
  async getBranches(): Promise<Branch[]> {
    const response = await this.fetch<{ branches: Branch[] }>('/users/branches');
    return response.branches || [];
  }

  /**
   * Get agents (optionally by branch)
   */
  async getAgents(branchId?: string): Promise<Pick<User, 'id' | 'name' | 'email'>[]> {
    const params = branchId ? `?branch_id=${branchId}` : '';
    const response = await this.fetch<{ agents: Pick<User, 'id' | 'name' | 'email'>[] }>(`/users/agents${params}`);
    return response.agents || [];
  }

  /**
   * Get all users (manager/admin only)
   */
  async getUsers(filters?: { role?: string; branch_id?: string }): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    
    const query = params.toString();
    const response = await this.fetch<{ users: User[] }>(`/users${query ? `?${query}` : ''}`);
    return response.users || [];
  }

  // ==================== TASKS ====================

  /**
   * Get tasks for current user (agent sees assigned, manager sees created)
   */
  async getTasks(branchId?: string): Promise<{ tasks: Task[] }> {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.fetch(`/tasks${params}`);
  }

  /**
   * Get single task by ID
   */
  async getTask(taskId: string): Promise<{ task: Task }> {
    return this.fetch(`/tasks/${taskId}`);
  }

  /**
   * Create a new task (manager only)
   */
  async createTask(data: {
    title: string;
    description?: string;
    priority?: Task['priority'];
    assigned_to_agent_id?: string;
    branch_id?: string;
    case_id?: string;
    deadline?: string;
  }): Promise<{ task: Task }> {
    return this.fetch('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update task status/details
   */
  async updateTask(taskId: string, data: {
    status?: Task['status'];
    description?: string;
    priority?: Task['priority'];
    deadline?: string;
  }): Promise<{ task: Task }> {
    return this.fetch(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get agents list (for task assignment)
   */
  async getAgentsForAssignment(branchId?: string): Promise<{ agents: Pick<User, 'id' | 'name' | 'email'>[] }> {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.fetch(`/tasks/meta/agents${params}`);
  }

  // ==================== REPORTS (Escalations) ====================

  /**
   * Get reports (manager sees submitted, admin sees all)
   */
  async getReports(): Promise<{ reports: Report[] }> {
    const response = await this.fetch<{ reports: any[] }>('/reports');
    
    // Map backend fields to frontend Report type
    const mappedReports = (response.reports || []).map((report: any): Report => ({
      id: report.id,
      branchId: report.branch_id || report.branch?.id || '',
      submittedBy: report.reported_by_manager_id || report.reported_by_agent_id || '',
      reportType: 'custom' as const,
      title: report.title || '',
      content: report.description || '',
      status: this.mapReportStatus(report.status) as ReportStatus,
      metrics: {
        totalConversations: 0,
        resolvedConversations: 0,
        escalatedConversations: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
        customerSatisfaction: 0,
        agentPerformance: [],
      },
      createdAt: new Date(report.created_at || Date.now()),
      submittedAt: report.created_at ? new Date(report.created_at) : undefined,
      reviewedBy: report.assigned_to_admin_id || undefined,
      adminNotes: report.admin_response || undefined,
    }));
    
    return { reports: mappedReports };
  }

  /**
   * Map backend status to frontend status
   */
  private mapReportStatus(status: string): 'draft' | 'submitted' | 'approved' | 'rejected' {
    const statusMap: Record<string, 'draft' | 'submitted' | 'approved' | 'rejected'> = {
      'draft': 'draft',
      'submitted': 'submitted',
      'under_review': 'submitted',
      'resolved': 'approved',
      'rejected': 'rejected',
      'pending': 'submitted', // Map pending to submitted (new reports are pending/submitted)
    };
    return (statusMap[status] || 'submitted') as 'draft' | 'submitted' | 'approved' | 'rejected';
  }

  /**
   * Get single report by ID
   */
  async getReport(reportId: string): Promise<{ report: Report }> {
    return this.fetch(`/reports/${reportId}`);
  }

  /**
   * Create a new report/escalation (manager only)
   */
  async createReport(data: {
    title: string;
    description?: string;
    urgency?: 'low' | 'normal' | 'high' | 'critical';
    case_id?: string;
    branch_id?: string;
  }): Promise<{ report: Report }> {
    return this.fetch('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update report status/response (admin)
   */
  async updateReport(reportId: string, data: {
    status?: Report['status'];
    admin_response?: string;
  }): Promise<{ report: Report }> {
    return this.fetch(`/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== REPORTS (Analytics) ====================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{
    overview: {
      total_cases: number;
      open_cases: number;
      resolved_cases: number;
      total_messages: number;
    };
    agent_performance: Array<{
      name: string;
      handled: number;
      resolved: number;
    }>;
    daily_messages: Record<string, number>;
    recent_activity: unknown[];
  }> {
    return this.fetch('/reports/dashboard');
  }

  /**
   * Get case report
   */
  async getCaseReport(filters?: {
    start_date?: string;
    end_date?: string;
    branch_id?: string;
    status?: string;
  }): Promise<{ cases: Case[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return this.fetch(`/reports/cases${query ? `?${query}` : ''}`);
  }

  /**
   * Get agent performance report
   */
  async getAgentReport(branchId?: string): Promise<{
    agents: Array<{
      id: string;
      name: string;
      email: string;
      branch?: string;
      stats: {
        total_assigned: number;
        open: number;
        pending: number;
        resolved: number;
        resolution_rate: number;
      };
    }>;
  }> {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.fetch(`/reports/agents${params}`);
  }

  // ==================== ROUTING ====================

  /**
   * Get pending queue (cases waiting for assignment)
   */
  async getRoutingQueue(): Promise<Array<{
    id: string;
    case_id: string;
    priority: string;
    queued_at: string;
    attempts: number;
    case: {
      customer_phone: string;
      customer_name?: string;
      last_message?: string;
    };
  }>> {
    return this.fetch('/routing/queue');
  }

  /**
   * Manually assign agent from queue
   */
  async assignFromQueue(caseId: string, agentId: string): Promise<void> {
    await this.fetch(`/routing/queue/${caseId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId }),
    });
  }

  /**
   * Get routing statistics
   */
  async getRoutingStats(): Promise<{
    methodDistribution: Record<string, number>;
    queueSize: number;
    period: string;
  }> {
    return this.fetch('/routing/stats');
  }

  // ==================== AUTH ====================

  /**
   * Signup with email, password, name and role
   */
  async signup(name: string, email: string, password: string, role: string, branchId?: string): Promise<{ token: string; user: User }> {
    // Use this.fetch() to properly handle base URL from environment
    const data = await this.fetch<{ token: string; user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, branchId }),
    });

    this.setToken(data.token);
    return data;
  }

  /**
   * Login with email and password - calls real backend
   */
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    // Use this.fetch() to properly handle base URL from environment
    const data = await this.fetch<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data;
  }

  /**
   * Logout
   */
  logout() {
    this.clearToken();
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }
}

// Export singleton instance
const api = new ApiService();

export default api;

// Export types for use in components
export type { Case, Message, Branch, User, CaseFilters, Task, Report };

// In-memory store for development when database isn't available
// This allows the app to work for testing without Supabase

interface InMemoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
  status: string;
  password?: string;
}

class InMemoryStore {
  private users: Map<string, InMemoryUser> = new Map();
  private branches: Map<string, any> = new Map();
  private tasks: Map<string, any> = new Map();
  private reports: Map<string, any> = new Map();
  private conversations: Map<string, any> = new Map();
  private messages: Map<string, any> = new Map();

  constructor() {
    // Add demo users
    this.users.set('demo-admin-1', {
      id: 'demo-admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      branch_id: null,
      status: 'online',
      password: 'password123'
    });
    this.users.set('demo-manager-1', {
      id: 'demo-manager-1',
      name: 'Branch Manager',
      email: 'manager@example.com',
      role: 'manager',
      branch_id: 'demo-branch-1',
      status: 'online',
      password: 'password123'
    });
    this.users.set('demo-agent-1', {
      id: 'demo-agent-1',
      name: 'Agent John',
      email: 'john@example.com',
      role: 'agent',
      branch_id: 'demo-branch-1',
      status: 'online',
      password: 'password123'
    });

    // Add demo branch
    this.branches.set('demo-branch-1', {
      id: 'demo-branch-1',
      name: 'Main Branch',
      location: 'Harare',
      status: 'active',
      created_at: new Date().toISOString()
    });
  }

  // User methods
  getUserById(id: string): InMemoryUser | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): InMemoryUser | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  createUser(user: Omit<InMemoryUser, 'id'>): InMemoryUser {
    const id = `user-${Date.now()}`;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  getAllUsers(): InMemoryUser[] {
    return Array.from(this.users.values());
  }

  getUsersByBranch(branchId: string): InMemoryUser[] {
    return Array.from(this.users.values()).filter(u => u.branch_id === branchId);
  }

  // Branch methods
  getBranchById(id: string): any | undefined {
    return this.branches.get(id);
  }

  getAllBranches(): any[] {
    return Array.from(this.branches.values());
  }

  createBranch(branch: any): any {
    const id = `branch-${Date.now()}`;
    const newBranch = { ...branch, id, created_at: new Date().toISOString() };
    this.branches.set(id, newBranch);
    return newBranch;
  }

  // Task methods
  getTaskById(id: string): any | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): any[] {
    return Array.from(this.tasks.values());
  }

  getTasksByAssignee(assigneeId: string): any[] {
    return Array.from(this.tasks.values()).filter(t => t.assignee_id === assigneeId);
  }

  createTask(task: any): any {
    const id = `task-${Date.now()}`;
    const newTask = { ...task, id, created_at: new Date().toISOString() };
    this.tasks.set(id, newTask);
    return newTask;
  }

  updateTask(id: string, updates: any): any | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...updates };
    this.tasks.set(id, updated);
    return updated;
  }

  // Report methods
  getReportById(id: string): any | undefined {
    return this.reports.get(id);
  }

  getAllReports(): any[] {
    return Array.from(this.reports.values());
  }

  getReportsByBranch(branchId: string): any[] {
    return Array.from(this.reports.values()).filter(r => r.branch_id === branchId);
  }

  createReport(report: any): any {
    const id = `report-${Date.now()}`;
    const newReport = { ...report, id, created_at: new Date().toISOString() };
    this.reports.set(id, newReport);
    return newReport;
  }

  // Conversation methods
  getConversationById(id: string): any | undefined {
    return this.conversations.get(id);
  }

  getAllConversations(): any[] {
    return Array.from(this.conversations.values());
  }

  getConversationsByBranch(branchId: string): any[] {
    return Array.from(this.conversations.values()).filter(c => c.branch_id === branchId);
  }

  createConversation(conversation: any): any {
    const id = `conv-${Date.now()}`;
    const newConversation = { ...conversation, id, created_at: new Date().toISOString() };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  // Message methods
  getMessagesByConversation(conversationId: string): any[] {
    return Array.from(this.messages.values())
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  createMessage(message: any): any {
    const id = `msg-${Date.now()}`;
    const newMessage = { ...message, id, created_at: new Date().toISOString() };
    this.messages.set(id, newMessage);
    return newMessage;
  }
}

export const inMemoryStore = new InMemoryStore();

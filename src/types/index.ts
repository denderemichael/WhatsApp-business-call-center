export type UserRole = 'admin' | 'branch_manager' | 'agent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
  avatar?: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  activeChats: number;
  pendingChats: number;
  unassignedChats: number;
  agents: Agent[];
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  branchId: string;
  status: 'online' | 'busy' | 'offline';
  activeChats: number;
  avatar?: string;
}

export type ConversationStatus = 'new' | 'in_progress' | 'escalated' | 'resolved';
export type ConversationTag = 'Loan' | 'Repayment' | 'Complaint' | 'General';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderType: 'customer' | 'agent';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  customerPhone: string;
  customerName: string;
  branchId: string;
  assignedAgentId?: string;
  status: ConversationStatus;
  tags: ConversationTag[];
  notes: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

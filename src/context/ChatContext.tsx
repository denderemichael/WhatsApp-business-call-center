import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Conversation, ConversationStatus, Branch, Agent } from '@/types';
import { mockConversations, mockBranches, mockAgents } from '@/data/mockData';

interface ChatContextType {
  conversations: Conversation[];
  branches: Branch[];
  agents: Agent[];
  selectedBranchId: string | null;
  selectedConversation: Conversation | null;
  setSelectedBranchId: (id: string | null) => void;
  setSelectedConversation: (conversation: Conversation | null) => void;
  updateConversationStatus: (conversationId: string, status: ConversationStatus) => void;
  assignAgent: (conversationId: string, agentId: string) => void;
  transferConversation: (conversationId: string, targetAgentId: string) => void;
  escalateConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  updateNotes: (conversationId: string, notes: string) => void;
  getFilteredConversations: (branchId?: string | null, agentId?: string) => Conversation[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [branches] = useState<Branch[]>(mockBranches);
  const [agents] = useState<Agent[]>(mockAgents);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const updateConversationStatus = (conversationId: string, status: ConversationStatus) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, status } : conv
      )
    );
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev => prev ? { ...prev, status } : null);
    }
  };

  const assignAgent = (conversationId: string, agentId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, assignedAgentId: agentId, status: 'in_progress' as ConversationStatus }
          : conv
      )
    );
  };

  const transferConversation = (conversationId: string, targetAgentId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, assignedAgentId: targetAgentId } : conv
      )
    );
  };

  const escalateConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, status: 'escalated' as ConversationStatus } : conv
      )
    );
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev => prev ? { ...prev, status: 'escalated' } : null);
    }
  };

  const sendMessage = (conversationId: string, content: string) => {
    const newMessage = {
      id: `msg-${Date.now()}`,
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
  };

  const updateNotes = (conversationId: string, notes: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, notes } : conv
      )
    );
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev => prev ? { ...prev, notes } : null);
    }
  };

  const getFilteredConversations = (branchId?: string | null, agentId?: string) => {
    return conversations.filter(conv => {
      if (branchId && conv.branchId !== branchId) return false;
      if (agentId && conv.assignedAgentId !== agentId) return false;
      return true;
    });
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        branches,
        agents,
        selectedBranchId,
        selectedConversation,
        setSelectedBranchId,
        setSelectedConversation,
        updateConversationStatus,
        assignAgent,
        transferConversation,
        escalateConversation,
        sendMessage,
        updateNotes,
        getFilteredConversations,
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

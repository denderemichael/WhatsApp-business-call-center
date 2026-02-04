import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { Conversation, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, MessageSquare } from 'lucide-react';
import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<ConversationStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'status-badge-new' },
  in_progress: { label: 'In Progress', className: 'status-badge-in-progress' },
  escalated: { label: 'Escalated', className: 'status-badge-escalated' },
  resolved: { label: 'Resolved', className: 'status-badge-resolved' },
};

export function ConversationList() {
  const { user } = useAuth();
  const {
    selectedBranchId,
    selectedConversation,
    setSelectedConversation,
    getFilteredConversations,
  } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all');

  const conversations = useMemo(() => {
    let convs = getFilteredConversations(selectedBranchId);
    
    // For agents, only show their assigned conversations
    if (user?.role === 'agent') {
      convs = convs.filter(c => c.assignedAgentId === user.id || !c.assignedAgentId);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      convs = convs.filter(
        c =>
          c.customerName.toLowerCase().includes(query) ||
          c.customerPhone.includes(query) ||
          c.lastMessage.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      convs = convs.filter(c => c.status === statusFilter);
    }

    // Sort by last message time
    return convs.sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [selectedBranchId, searchQuery, statusFilter, getFilteredConversations, user]);

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground mb-3">Conversations</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {/* Status filters */}
        <div className="flex gap-1 mt-3 flex-wrap">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          {(Object.keys(statusConfig) as ConversationStatus[]).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setStatusFilter(status)}
            >
              {statusConfig[status].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No conversations found</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedConversation?.id === conversation.id}
              onClick={() => setSelectedConversation(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const { branches } = useChat();
  const branch = branches.find(b => b.id === conversation.branchId);
  const config = statusConfig[conversation.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 flex gap-3 border-b border-border/50 hover:bg-muted/50 transition-colors text-left',
        isSelected && 'bg-muted'
      )}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm">
          {conversation.customerName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm text-foreground truncate">
            {conversation.customerName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(conversation.lastMessageTime), { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mb-2">
          {conversation.lastMessage}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {branch?.name}
          </Badge>
          <Badge className={cn('text-[10px] px-1.5 py-0', config.className)}>
            {config.label}
          </Badge>
          {conversation.unreadCount > 0 && (
            <Badge className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

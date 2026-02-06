import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { Message, ConversationStatus, Task } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Send,
  MoreVertical,
  Phone,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Clock,
  ClipboardList,
  Lock,
  UserCheck,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusConfig: Record<ConversationStatus, { label: string; icon: typeof Clock; className: string }> = {
  new: { label: 'New', icon: MessageSquare, className: 'text-info' },
  assigned: { label: 'Assigned', icon: Clock, className: 'text-blue-500' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'text-warning' },
  escalated: { label: 'Escalated', icon: AlertTriangle, className: 'text-destructive' },
  resolved: { label: 'Resolved', icon: CheckCircle, className: 'text-success' },
  closed: { label: 'Closed', icon: CheckCircle, className: 'text-gray-500' },
};

export function ChatWindow() {
  const { user } = useAuth();
  const { 
    selectedConversation, 
    sendMessage, 
    updateConversationStatus, 
    escalateConversation,
    tasks,
    agents,
    branches,
    assignConversation,
  } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if user can reply (agents can reply to any conversation in their branch)
  const canReply = user?.role === 'agent' && (
    selectedConversation?.assignedAgentId === user.id ||
    !selectedConversation?.assignedAgentId ||
    selectedConversation?.branchId === user.branchId
  );
  // Check if user can assign agents (manager/admin)
  const canAssign = user?.role === 'branch_manager' || user?.role === 'admin';

  // Get task info if conversation has a task
  const taskInfo = selectedConversation?.taskId 
    ? tasks.find(t => t.id === selectedConversation.taskId)
    : null;

  // Get branch and agents for this conversation
  const branch = selectedConversation 
    ? branches.find(b => b.id === selectedConversation.branchId)
    : null;
  const branchAgents = branch 
    ? agents.filter(a => a.branchId === branch.id)
    : [];
  const assignedAgent = selectedConversation?.assignedAgentId
    ? agents.find(a => a.id === selectedConversation.assignedAgentId)
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Select a conversation</h3>
          <p className="text-sm text-muted-foreground/70">Choose a chat from the list to start messaging</p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (newMessage.trim() && canReply) {
      sendMessage(selectedConversation.id, newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const StatusIcon = statusConfig[selectedConversation.status]?.icon || Clock;

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {selectedConversation.customerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-foreground">{selectedConversation.customerName}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {selectedConversation.customerPhone}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Assigned Agent Badge */}
          {assignedAgent ? (
            <Badge variant="secondary" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
              <UserCheck className="h-3 w-3" />
              {assignedAgent.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Unassigned
            </Badge>
          )}
          
          {/* Task badge if conversation has task */}
          {taskInfo && (
            <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200">
              <ClipboardList className="h-3 w-3" />
              Task: {taskInfo.title}
            </Badge>
          )}
          
          <Badge variant="outline" className={cn('flex items-center gap-1', statusConfig[selectedConversation.status]?.className)}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig[selectedConversation.status]?.label}
          </Badge>
          
          {/* Agent Assignment for Managers */}
          {canAssign && (
            <Select 
              value={selectedConversation.assignedAgentId || ''} 
              onValueChange={(agentId) => assignConversation(selectedConversation.id, agentId)}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Assign agent" />
              </SelectTrigger>
              <SelectContent>
                {branchAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.name}</span>
                      <Badge variant="outline" className="text-[10px] ml-2">
                        {agent.activeChats}/{agent.maxChats}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Only agents can access actions */}
          {canReply && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => updateConversationStatus(selectedConversation.id, 'in_progress')}>
                  <Clock className="mr-2 h-4 w-4" />
                  Mark In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateConversationStatus(selectedConversation.id, 'resolved')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Resolve
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => escalateConversation(selectedConversation.id)}>
                  <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                  Escalate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Task Info Banner */}
      {taskInfo && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2 text-sm">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">Task: {taskInfo.title}</span>
            {taskInfo.priority === 'urgent' && (
              <Badge variant="destructive" className="text-[10px]">Urgent</Badge>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-muted/20">
        {selectedConversation.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        {canReply ? (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                disabled={selectedConversation.status === 'resolved' || selectedConversation.status === 'closed'}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || selectedConversation.status === 'resolved' || selectedConversation.status === 'closed'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {selectedConversation.status === 'resolved' || selectedConversation.status === 'closed' ? (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                This conversation is resolved. Reopen to send messages.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>
                {user?.role === 'agent' 
                  ? "You can only reply to your assigned conversations"
                  : user?.role === 'branch_manager'
                  ? "Only assigned agents can reply to conversations"
                  : "Only agents can reply to conversations"
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isOutgoing = message.senderType === 'agent';

  return (
    <div className={cn('flex', isOutgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isOutgoing
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        <p className="text-sm">{message.content}</p>
        <div className={cn('flex items-center gap-1 mt-1', isOutgoing ? 'justify-end' : 'justify-start')}>
          <span className={cn('text-[10px]', isOutgoing ? 'text-white/70' : 'text-muted-foreground')}>
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
          {isOutgoing && (
            <span className="text-[10px] text-white/70">
              {message.status === 'sent' ? '✓' : message.status === 'delivered' ? '✓✓' : '✓✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

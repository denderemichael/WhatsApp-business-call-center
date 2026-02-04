import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { Message, ConversationStatus } from '@/types';
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
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<ConversationStatus, { label: string; icon: typeof Clock; className: string }> = {
  new: { label: 'New', icon: MessageSquare, className: 'text-info' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'text-warning' },
  escalated: { label: 'Escalated', icon: AlertTriangle, className: 'text-destructive' },
  resolved: { label: 'Resolved', icon: CheckCircle, className: 'text-success' },
};

export function ChatWindow() {
  const { selectedConversation, sendMessage, updateConversationStatus, escalateConversation } = useChat();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (newMessage.trim()) {
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

  const StatusIcon = statusConfig[selectedConversation.status].icon;

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
          <Badge variant="outline" className={cn('flex items-center gap-1', statusConfig[selectedConversation.status].className)}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig[selectedConversation.status].label}
          </Badge>
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
              {(user?.role === 'admin' || user?.role === 'branch_manager') && (
                <DropdownMenuItem>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-muted/20">
        {selectedConversation.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={selectedConversation.status === 'resolved'}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || selectedConversation.status === 'resolved'}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {selectedConversation.status === 'resolved' && (
          <p className="text-xs text-muted-foreground mt-2">
            This conversation is resolved. Reopen to send messages.
          </p>
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
          'max-w-[70%] rounded-2xl px-4 py-2 animate-slide-up',
          isOutgoing
            ? 'chat-bubble-outgoing rounded-br-md'
            : 'chat-bubble-incoming rounded-bl-md'
        )}
      >
        <p className="text-sm">{message.content}</p>
        <div className={cn('flex items-center gap-1 mt-1', isOutgoing ? 'justify-end' : 'justify-start')}>
          <span className={cn('text-[10px]', isOutgoing ? 'text-white/70' : 'text-muted-foreground')}>
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
        </div>
      </div>
    </div>
  );
}

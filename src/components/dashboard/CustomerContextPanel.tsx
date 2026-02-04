import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { ConversationTag } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  Building2,
  User,
  Tag,
  FileText,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';

const tagColors: Record<ConversationTag, string> = {
  Loan: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Repayment: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Complaint: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  General: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function CustomerContextPanel() {
  const { selectedConversation, branches, agents, updateNotes, transferConversation, escalateConversation } = useChat();
  const { user } = useAuth();
  const [notes, setNotes] = useState(selectedConversation?.notes || '');
  const [selectedAgentId, setSelectedAgentId] = useState('');

  if (!selectedConversation) {
    return (
      <div className="w-80 bg-card border-l border-border flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a conversation to view details</p>
      </div>
    );
  }

  const branch = branches.find(b => b.id === selectedConversation.branchId);
  const assignedAgent = agents.find(a => a.id === selectedConversation.assignedAgentId);
  const availableAgents = agents.filter(
    a => a.branchId === selectedConversation.branchId && a.id !== selectedConversation.assignedAgentId
  );

  const handleSaveNotes = () => {
    updateNotes(selectedConversation.id, notes);
  };

  const handleTransfer = () => {
    if (selectedAgentId) {
      transferConversation(selectedConversation.id, selectedAgentId);
      setSelectedAgentId('');
    }
  };

  const handleEscalate = () => {
    escalateConversation(selectedConversation.id);
  };

  const canTransfer = user?.role === 'admin' || user?.role === 'branch_manager';

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full overflow-y-auto scrollbar-thin">
      {/* Customer Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {selectedConversation.customerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{selectedConversation.customerName}</h3>
            <p className="text-xs text-muted-foreground">Customer</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{selectedConversation.customerPhone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{branch?.name}</span>
          </div>
          {assignedAgent && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{assignedAgent.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Tags</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedConversation.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className={tagColors[tag]}>
              {tag}
            </Badge>
          ))}
          {selectedConversation.tags.length === 0 && (
            <span className="text-xs text-muted-foreground">No tags</span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Notes</Label>
        </div>
        <Textarea
          placeholder="Add notes about this customer..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[80px] text-sm"
        />
        <Button size="sm" className="mt-2 w-full" onClick={handleSaveNotes}>
          Save Notes
        </Button>
      </div>

      {/* Actions */}
      {canTransfer && (
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transfer Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            agent.status === 'online'
                              ? 'bg-success'
                              : agent.status === 'busy'
                              ? 'bg-warning'
                              : 'bg-muted-foreground'
                          }`}
                        />
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                disabled={!selectedAgentId}
                onClick={handleTransfer}
              >
                Transfer
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Escalate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xs text-muted-foreground mb-2">
                Escalate this conversation to a supervisor for urgent handling.
              </p>
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={handleEscalate}
                disabled={selectedConversation.status === 'escalated'}
              >
                {selectedConversation.status === 'escalated' ? 'Already Escalated' : 'Escalate'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

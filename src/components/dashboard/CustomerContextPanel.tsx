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
import { useState } from 'react';

// Zimbabwe locations for branches
const zimbabweLocations: Record<string, string> = {
  'Harare CBD': 'location_on',
  'Chitungwiza': 'location_on',
  'Mutare': 'location_on',
  'Bulawayo': 'location_on',
  'Gweru': 'location_on',
  'Masvingo': 'location_on',
  'Kwekwe': 'location_on',
  'Zvishavane': 'location_on',
};

const tagColors: Record<ConversationTag, string> = {
  Loan: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Repayment: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Complaint: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  General: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  Inquiry: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  Support: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function CustomerContextPanel({ onClose }: { onClose?: () => void }) {
  const { selectedConversation, branches, agents, updateNotes, transferConversation, escalateConversation } = useChat();
  const { user } = useAuth();
  const [notes, setNotes] = useState(selectedConversation?.notes || '');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

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
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
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

  // Get location icon for branch
  const getLocationIcon = (locationName: string) => {
    // Check if location contains Harare, Chitungwiza, etc.
    for (const [loc, icon] of Object.entries(zimbabweLocations)) {
      if (locationName.toLowerCase().includes(loc.toLowerCase())) {
        return icon;
      }
    }
    return 'location_on'; // Default location icon
  };

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full overflow-y-auto scrollbar-thin">
      {/* Header with close button */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Customer Details</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <span className="material-icons text-sm">close</span>
          </Button>
        )}
      </div>
      
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
            <p className="text-xs text-muted-foreground capitalize">{user?.role || 'Customer'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-icons text-muted-foreground text-sm">phone</span>
            <span className="text-foreground">{selectedConversation.customerPhone}</span>
          </div>
          
          {/* Location - Harare CBD, Chitungwiza, etc. */}
          <div className="flex items-center gap-2 text-sm">
            <span className="material-icons text-muted-foreground text-sm">
              {getLocationIcon(branch?.name || '')}
            </span>
            <span className="text-foreground">{branch?.name}</span>
          </div>
          
          {assignedAgent && (
            <div className="flex items-center gap-2 text-sm">
              <span className="material-icons text-muted-foreground text-sm">person</span>
              <span className="text-foreground">{assignedAgent.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-icons text-muted-foreground text-sm">sell</span>
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
          <span className="material-icons text-muted-foreground text-sm">note</span>
          <Label className="text-sm font-medium">Notes</Label>
        </div>
        <Textarea
          placeholder="Add notes about this customer..."
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesSaved(false);
          }}
          className="min-h-[80px] text-sm"
        />
        <Button 
          size="sm" 
          className="mt-2 w-full" 
          onClick={handleSaveNotes}
          variant={notesSaved ? "outline" : "default"}
        >
          <span className="material-icons text-sm mr-1">
            {notesSaved ? 'check' : 'save'}
          </span>
          {notesSaved ? 'Saved!' : 'Save Notes'}
        </Button>
      </div>

      {/* Actions */}
      {canTransfer && (
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="material-icons text-sm">swap_horiz</span>
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
                <span className="material-icons text-sm mr-1">swap_horiz</span>
                Transfer
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <span className="material-icons text-sm">warning</span>
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
                <span className="material-icons text-sm mr-1">arrow_upward</span>
                {selectedConversation.status === 'escalated' ? 'Already Escalated' : 'Escalate'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRealChat } from '@/context/RealChatContext';
import { Report, ReportStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';

const statusIcons: Record<ReportStatus, React.ElementType> = {
  draft: Clock,
  submitted: Send,
  approved: CheckCircle,
  rejected: XCircle,
};

const statusColors: Record<ReportStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export function ReportPanel() {
  const { user } = useAuth();
  const { reports, createReport, updateReportStatus, adminDashboardStats } = useRealChat();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('all');

  const isAdmin = user?.role === 'admin';
  const isBranchManager = user?.role === 'branch_manager' || user?.role === 'manager';

  // Filter reports based on role
  const filteredReports = reports.filter(report => {
    if (isAdmin) {
      return true; // Admin sees all reports
    }
    if (isBranchManager) {
      return report.branchId === user.branchId || !report.branchId; // Manager sees only their branch
    }
    return false;
  }).filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingReviewCount = reports.filter(r => r.status === 'submitted').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports
          </h2>
          {isBranchManager && (
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Report
            </Button>
          )}
          {isAdmin && pendingReviewCount > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              {pendingReviewCount} pending review
            </Badge>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'submitted', 'approved', 'rejected'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              className="text-xs"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Report List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredReports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No reports found</p>
            {isBranchManager && (
              <Button size="sm" className="mt-2" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Report
              </Button>
            )}
          </div>
        ) : (
          filteredReports.map((report) => (
            <Card 
              key={report.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedReport(report)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={statusColors[report.status]} variant="secondary">
                    {report.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(report.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <h4 className="font-medium text-sm mb-1">{report.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {report.content}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">
                    {report.reportType} Report
                  </span>
                  
                  {/* Admin actions for submitted reports */}
                  {isAdmin && report.status === 'submitted' && (
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateReportStatus(report.id, 'approved', 'Report approved');
                        }}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 text-xs text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateReportStatus(report.id, 'rejected', 'Needs revision');
                        }}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* Metrics preview */}
                <div className="mt-3 pt-2 border-t border-border grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-semibold">{report.metrics.totalConversations}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-600">{report.metrics.resolvedConversations}</p>
                    <p className="text-[10px] text-muted-foreground">Resolved</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-blue-600">{report.metrics.averageResponseTime}m</p>
                    <p className="text-[10px] text-muted-foreground">Avg Response</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Report Dialog */}
      {isBranchManager && (
        <CreateReportDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreate={createReport}
        />
      )}

      {/* Report Detail Dialog */}
      {selectedReport && (
        <ReportDetailDialog
          report={selectedReport}
          open={!!selectedReport}
          onOpenChange={(open) => !open && setSelectedReport(null)}
          isAdmin={isAdmin}
          onStatusUpdate={(status, notes) => {
            updateReportStatus(selectedReport.id, status, notes);
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
}

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (report: Omit<Report, 'id' | 'createdAt'>) => void;
}

function CreateReportDialog({ open, onOpenChange, onCreate }: CreateReportDialogProps) {
  const { user } = useAuth();
  const { reports, createReport, updateReportStatus, getBranchReports, api } = useRealChat();
  const { branches } = useRealChat();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || '');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [availableAgents, setAvailableAgents] = useState<Array<{id: string; name: string; branchId: string}>>([]);

  const isAdmin = user?.role === 'admin';
  const isBranchManager = user?.role === 'branch_manager' || user?.role === 'manager';
  const canSelectBranch = isAdmin || isBranchManager;

  // Fetch agents when branch changes or when dialog opens
  useEffect(() => {
    if (!open) return; // Only fetch when dialog is open
    const fetchAgents = async () => {
      try {
        // If a branch is selected, fetch agents for that branch only
        if (selectedBranchId) {
          const agents = await api.getAgents(selectedBranchId);
          setAvailableAgents(agents.map(a => ({ id: a.id, name: a.name, branchId: selectedBranchId })));
        } else {
          // If no branch selected, get all agents
          const agents = await api.getAgents();
          setAvailableAgents(agents.map(a => ({ id: a.id, name: a.name, branchId: '' })));
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
        setAvailableAgents([]);
      }
    };
    fetchAgents();
  }, [selectedBranchId, api, open]);

  // Reset agent selection when branch changes
  useEffect(() => {
    setSelectedAgentId('');
  }, [selectedBranchId]);

  const handleCreate = () => {
    if (!title || !description || !selectedBranchId) return;

    onCreate({
      branchId: selectedBranchId,
      submittedBy: user?.id,
      reportType: 'custom',
      title,
      content: description,
      status: 'submitted',
      submittedAt: new Date(),
      metrics: {
        totalConversations: 0,
        resolvedConversations: 0,
        escalatedConversations: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
        customerSatisfaction: 0,
        agentPerformance: [],
      },
    });

    toast({
      title: 'Report Submitted',
      description: 'Your report has been submitted to the admin for review.',
    });

    // Reset form
    setTitle('');
    setDescription('');
    setSelectedBranchId(user?.branchId || '');
    setSelectedAgentId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Branch Selection */}
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select 
              value={selectedBranchId} 
              onValueChange={setSelectedBranchId}
              disabled={!canSelectBranch}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Related Agent (Optional) */}
          <div className="space-y-2">
            <Label>Related Agent (Optional)</Label>
            <Select 
              value={selectedAgentId} 
              onValueChange={setSelectedAgentId}
              disabled={!selectedBranchId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {availableAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="title">Subject</Label>
            <Input
              id="title"
              placeholder="Enter report subject"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue or report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title || !selectedBranchId || !description}>
            <Send className="h-4 w-4 mr-1" />
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReportDetailDialogProps {
  report: Report;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onStatusUpdate: (status: ReportStatus, notes?: string) => void;
}

function ReportDetailDialog({ report, open, onOpenChange, isAdmin, onStatusUpdate }: ReportDetailDialogProps) {
  const [adminNotes, setAdminNotes] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {report.title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusColors[report.status]} variant="secondary">
              {report.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {format(new Date(report.createdAt), 'MMMM d, yyyy')}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Content */}
          <div>
            <h4 className="font-medium mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">{report.content}</p>
          </div>

          {/* Metrics */}
          <div>
            <h4 className="font-medium mb-3">Key Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{report.metrics.totalConversations}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{report.metrics.resolvedConversations}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{report.metrics.escalatedConversations}</p>
                  <p className="text-xs text-muted-foreground">Escalated</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{report.metrics.averageResponseTime}m</p>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Agent Performance */}
          {report.metrics.agentPerformance.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Agent Performance</h4>
              <div className="space-y-2">
                {report.metrics.agentPerformance.map((agent) => (
                  <div key={agent.agentId} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{agent.agentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.conversationsHandled} handled • {agent.resolvedConversations} resolved
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{agent.averageResponseTime}m</p>
                      <p className="text-xs text-muted-foreground">avg response</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Review Section */}
          {isAdmin && report.status === 'submitted' && (
            <div className="border-t pt-4">
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                placeholder="Add notes for the branch manager..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          {report.adminNotes && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Admin Review</h4>
              <p className="text-sm text-muted-foreground">{report.adminNotes}</p>
              {report.reviewedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reviewed on {format(new Date(report.reviewedAt), 'MMM d, yyyy HH:mm')}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {isAdmin && report.status === 'submitted' ? (
            <div className="flex gap-2 w-full justify-end">
              <Button 
                variant="outline" 
                onClick={() => onStatusUpdate('rejected', adminNotes)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button onClick={() => onStatusUpdate('approved', adminNotes)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

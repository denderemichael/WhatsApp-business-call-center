import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { Task, TaskStatus, TaskPriority } from '@/types';
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
import {
  Plus,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Play,
  Circle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const statusIcons: Record<TaskStatus, React.ElementType> = {
  pending: Clock,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: AlertTriangle,
};

const statusColors: Record<TaskStatus, string> = {
  pending: 'text-gray-600',
  in_progress: 'text-blue-600',
  completed: 'text-green-600',
  cancelled: 'text-red-600',
};

interface TaskPanelProps {
  onSelectTask?: (task: Task) => void;
}

export function TaskPanel({ onSelectTask }: TaskPanelProps) {
  const { user } = useAuth();
  const { 
    tasks, 
    branches, 
    agents,
    createTask, 
    updateTaskStatus,
    getPendingTasksCount,
  } = useChat();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  // Handle status change
  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    updateTaskStatus(taskId, status);
  };

  // Filter tasks based on user role
  const filteredTasks = tasks.filter(task => {
    if (user?.role === 'branch_manager') {
      // Branch managers see tasks in their branch
      const branch = branches.find(b => b.id === user.branchId);
      return task.branchId === branch?.id;
    } else if (user?.role === 'agent') {
      // Agents see only their assigned tasks
      return task.assignedTo === user.id;
    }
    return true;
  }).filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  }).sort((a, b) => {
    // Sort by priority first, then by date
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pendingCount = getPendingTasksCount(user?.branchId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Tasks</h2>
          {user?.role === 'branch_manager' && (
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              className="text-xs"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
              {f !== 'all' && tasks.filter(t => t.status === f).length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {tasks.filter(t => t.status === f).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks found</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <Card 
              key={task.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelectTask?.(task)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={priorityColors[task.priority]} variant="secondary">
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                    </span>
                  )}
                </div>
                
                <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {task.description}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {agents.find(a => a.id === task.assignedTo)?.name || 'Unknown'}
                  </div>
                  <span>
                    {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {task.conversationId && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <Badge variant="outline" className="text-xs text-primary">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Linked to conversation
                    </Badge>
                  </div>
                )}

                {/* Status Action Buttons */}
                <div className="mt-3 pt-2 border-t border-border flex gap-1">
                  <Button
                    size="sm"
                    variant={task.status === 'pending' ? 'default' : 'outline'}
                    className="h-7 text-xs flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(task.id, 'pending');
                    }}
                  >
                    <Circle className="h-3 w-3 mr-1" />
                    Pending
                  </Button>
                  <Button
                    size="sm"
                    variant={task.status === 'in_progress' ? 'default' : 'outline'}
                    className="h-7 text-xs flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(task.id, 'in_progress');
                    }}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    In Progress
                  </Button>
                  <Button
                    size="sm"
                    variant={task.status === 'completed' ? 'default' : 'outline'}
                    className="h-7 text-xs flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(task.id, 'completed');
                    }}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={createTask}
      />
    </div>
  );
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

function CreateTaskDialog({ open, onOpenChange, onCreate }: CreateTaskDialogProps) {
  const { user } = useAuth();
  const { branches, agents } = useChat();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || '');

  // Get available agents - admins see all, managers see their branch's agents
  const availableAgents = selectedBranchId 
    ? agents.filter(a => a.branchId === selectedBranchId)
    : agents;

  const handleCreate = () => {
    if (!title || !assignedTo) return;

    onCreate({
      branchId: selectedBranchId || user?.branchId || 'branch-1',
      assignedBy: user?.id || 'manager-1',
      assignedTo,
      title,
      description,
      priority,
      status: 'pending',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      conversationId: undefined,
      notes: undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('normal');
    setAssignedTo('');
    setDueDate('');
    setSelectedBranchId(user?.branchId || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
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

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} disabled={!selectedBranchId && agents.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.length === 0 ? (
                    <SelectItem value="no-agents" disabled>
                      No agents available
                    </SelectItem>
                  ) : (
                    availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            agent.status === 'online' ? 'bg-green-500' : 
                            agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                          }`} />
                          {agent.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title || !assignedTo}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

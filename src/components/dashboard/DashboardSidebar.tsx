import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

export function DashboardSidebar({ showConversationList, setShowConversationList }: { showConversationList?: boolean; setShowConversationList?: (show: boolean) => void }) {
  const { user, logout } = useAuth();
  const { 
    branches, 
    agents,
    selectedBranchId, 
    setSelectedBranchId, 
    getFilteredConversations,
    getPendingTasksCount,
  } = useChat();
  const [branchesOpen, setBranchesOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canViewAllBranches = user?.role === 'admin' || user?.role === 'branch_manager';
  const visibleBranches = canViewAllBranches
    ? branches
    : branches.filter(b => b.id === user?.branchId);

  const getTotalUnread = (branchId?: string) => {
    const convs = getFilteredConversations(branchId);
    return convs.reduce((sum, c) => sum + c.unreadCount, 0);
  };

  const pendingTasksCount = user?.branchId ? getPendingTasksCount(user.branchId) : 0;

  function getStatusColor(status: string) {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'online': return 'Online';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  }

  function getStatusColorIcon(status: string) {
    switch (status) {
      case 'online':
      case 'resolved':
      case 'success':
        return '#22C55E';
      case 'busy':
      case 'in-progress':
      case 'warning':
        return '#F59E0B';
      case 'offline':
      case 'escalated':
      case 'error':
      case 'destructive':
        return '#EF4444';
      default:
        return '#808080';
    }
  }

  return (
    <div className="w-64 bg-sidebar h-screen flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="material-icons text-white text-2xl">message</span>
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">WhatsApp Hub</h1>
            <p className="text-xs text-sidebar-foreground/60">Contact Centre</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {/* Dashboard/Home */}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            !selectedBranchId && 'bg-sidebar-accent text-sidebar-accent-foreground'
          )}
          onClick={() => {
            setSelectedBranchId(null);
            navigate('/dashboard');
          }}
        >
          <span className="material-icons mr-3 text-xl">dashboard</span>
          Dashboard
        </Button>

        {/* Inbox */}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            selectedBranchId === 'all' && 'bg-sidebar-accent text-sidebar-accent-foreground'
          )}
          onClick={() => {
            setSelectedBranchId('all');
            if (setShowConversationList) {
              setShowConversationList(true);
            }
          }}
        >
          <span className="material-icons mr-3 text-xl">inbox</span>
          Inbox
          {getTotalUnread() > 0 && (
            <Badge className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground">
              {getTotalUnread()}
            </Badge>
          )}
        </Button>

        {/* Conversation List Toggle */}
        {setShowConversationList && (
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setShowConversationList(!showConversationList)}
          >
            <span className="material-icons mr-3 text-xl">
              {showConversationList ? 'panel_right' : 'chat'}
            </span>
            {showConversationList ? 'Hide Chats' : 'Show Chats'}
          </Button>
        )}

        {/* Tasks - Branch Managers Only */}
        {(user?.role === 'branch_manager' || user?.role === 'admin') && (
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => navigate('/tasks')}
          >
            <span className="material-icons mr-3 text-xl">assignment</span>
            Tasks
            {pendingTasksCount > 0 && (
              <Badge variant="secondary" className="ml-auto bg-yellow-500/20 text-yellow-600">
                {pendingTasksCount}
              </Badge>
            )}
          </Button>
        )}

        {/* Agents see their tasks */}
        {user?.role === 'agent' && (
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => navigate('/tasks')}
          >
            <span className="material-icons mr-3 text-xl">assignment_ind</span>
            My Tasks
          </Button>
        )}

        {/* Branches - Only for Admins and Branch Managers */}
        {(user?.role === 'admin' || user?.role === 'branch_manager') && (
          <Collapsible open={branchesOpen} onOpenChange={setBranchesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className="material-icons mr-3 text-xl">business</span>
                Branches
                <span className={cn(
                  'material-icons ml-auto text-sm transition-transform',
                  branchesOpen ? 'expand_more' : 'expand_less'
                )}>
                  {branchesOpen ? 'expand_more' : 'expand_less'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
              {visibleBranches.map((branch) => {
                const unread = getTotalUnread(branch.id);
              return (
                <Button
                  key={branch.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    selectedBranchId === branch.id &&
                      'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                  onClick={() => setSelectedBranchId(branch.id)}
                >
                  <span className="truncate">{branch.name}</span>
                  {unread > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-auto bg-sidebar-primary/20 text-sidebar-primary"
                    >
                      {unread}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
        )}

        {/* Admin/Manager only sections */}
        {(user?.role === 'admin' || user?.role === 'branch_manager') && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <span className="material-icons mr-3 text-xl">people</span>
                  Agents
                  <span className="ml-auto text-xs bg-sidebar-primary/20 px-2 py-0.5 rounded-full">
                    {agents.length}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>All Agents</span>
                  <span className="text-xs text-muted-foreground">
                    {agents.filter(a => a.status === 'online').length} online
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {agents.map((agent) => {
                  const branch = branches.find(b => b.id === agent.branchId);
                  const agentConversations = getFilteredConversations(branch?.id).filter(
                    c => c.assignedAgentId === agent.id
                  );
                  return (
                    <DropdownMenuItem key={agent.id} className="flex flex-col items-start p-3">
                      <div className="flex items-center gap-2 w-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={agent.avatar} />
                          <AvatarFallback className="text-xs">
                            {agent.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{agent.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {branch?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span 
                            className="material-icons text-sm" 
                            style={{ color: getStatusColorIcon(agent.status) }}
                          >
                            fiber_manual_record
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {getStatusText(agent.status)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 w-full text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-sm">chat</span>
                          {agentConversations.length} chats
                        </span>
                        <span>
                          {agent.activeChats}/{agent.maxChats} active
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Analyst/Analytics - Admin and Branch Manager */}
        {(user?.role === 'admin' || user?.role === 'branch_manager') && (
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => navigate('/analytics')}
          >
            <span className="material-icons mr-3 text-xl">analytics</span>
            Analyst
          </Button>
        )}

        {/* Reports - Admin and Branch Manager */}
        {(user?.role === 'admin' || user?.role === 'branch_manager') && (
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => navigate('/reports')}
          >
            <span className="material-icons mr-3 text-xl">description</span>
            Reports
          </Button>
        )}

        {/* Admin only */}
        {user?.role === 'admin' && (
          <>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <span className="material-icons mr-3 text-xl">settings</span>
              Settings
            </Button>
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <span className="material-icons">logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

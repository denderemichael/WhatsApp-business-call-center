import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  Building2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function DashboardSidebar() {
  const { user, logout } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId, getFilteredConversations } = useChat();
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

  return (
    <div className="w-64 bg-sidebar h-screen flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">WhatsApp Hub</h1>
            <p className="text-xs text-sidebar-foreground/60">Support System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {/* All Chats */}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            !selectedBranchId && 'bg-sidebar-accent text-sidebar-accent-foreground'
          )}
          onClick={() => setSelectedBranchId(null)}
        >
          <MessageCircle className="mr-3 h-4 w-4" />
          All Chats
          {getTotalUnread() > 0 && (
            <Badge className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground">
              {getTotalUnread()}
            </Badge>
          )}
        </Button>

        {/* Branches */}
        <Collapsible open={branchesOpen} onOpenChange={setBranchesOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Building2 className="mr-3 h-4 w-4" />
              Branches
              <ChevronDown
                className={cn(
                  'ml-auto h-4 w-4 transition-transform',
                  branchesOpen && 'rotate-180'
                )}
              />
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

        {/* Admin/Manager only sections */}
        {(user?.role === 'admin' || user?.role === 'branch_manager') && (
          <>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Users className="mr-3 h-4 w-4" />
              Agents
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              Analytics
            </Button>
          </>
        )}

        {user?.role === 'admin' && (
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </Button>
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
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

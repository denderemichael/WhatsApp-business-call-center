import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const statusColors = {
  online: 'bg-green-500',
  busy: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const statusLabels = {
  online: 'Online',
  busy: 'Busy',
  offline: 'Offline',
};

const notificationIcons: Record<string, string> = {
  task_assigned: 'assignment',
  chat_transferred: 'swap_horiz',
  report_submitted: 'notifications',
  report_reviewed: 'notifications',
  conversation_escalated: 'priority_high',
  agent_status_changed: 'person',
};

export function DashboardHeader() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadNotificationsCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    updateAgentStatus,
    adminDashboardStats,
  } = useChat();
  const [isDark] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [searchParams] = useSearchParams();

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    // Mark as read
    markNotificationAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.metadata?.taskId) {
      navigate(`/tasks?task=${notification.metadata.taskId}`);
    } else if (notification.metadata?.conversationId) {
      navigate(`/dashboard?conversation=${notification.metadata.conversationId}`);
    } else if (notification.metadata?.reportId) {
      navigate(`/reports?report=${notification.metadata.reportId}`);
    } else if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleStatusChange = async (status: 'online' | 'busy' | 'offline') => {
    if (user) {
      await updateAgentStatus(user.id, status);
    }
  };

  const handleSaveProfile = () => {
    if (user && editName) {
      updateUser({ name: editName });
      setIsProfileOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icon = notificationIcons[type] || 'notifications';
    return <span className="material-icons text-sm">{icon}</span>;
  };

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4">
      {/* Left side - empty since searchbar was removed */}
      <div />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Admin Dashboard Stats */}
        {user?.role === 'admin' && adminDashboardStats && (
          <div className="hidden lg:flex items-center gap-4 px-3 py-1 bg-muted/50 rounded-lg text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {adminDashboardStats.agentsOnline} Online
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {adminDashboardStats.agentsOffline} Offline
            </span>
            <span className="text-muted-foreground">
              {adminDashboardStats.totalConversationsToday} Chats
            </span>
          </div>
        )}

        {/* Agent Status - Only show for agents */}
        {user?.role === 'agent' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8">
                <span className={cn('w-2 h-2 rounded-full', statusColors[user?.status || 'offline'])} />
                {statusLabels[user?.status || 'offline']}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Set Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange('online')} className="gap-2">
                <span className={cn('w-2 h-2 rounded-full', statusColors.online)} />
                Online
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('busy')} className="gap-2">
                <span className={cn('w-2 h-2 rounded-full', statusColors.busy)} />
                Busy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('offline')} className="gap-2">
                <span className={cn('w-2 h-2 rounded-full', statusColors.offline)} />
                Offline
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Notifications - Scrollable Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <span className="material-icons">notifications</span>
              {unreadNotificationsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                >
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[400px] p-0">
            <DropdownMenuLabel className="flex items-center justify-between sticky top-0 bg-background z-10">
              Notifications
              {unreadNotificationsCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={markAllNotificationsAsRead}
                >
                  Mark all as read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 cursor-pointer',
                      !notification.isRead && 'bg-muted/50'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {getNotificationIcon(notification.type)}
                      <span className="font-medium text-sm">{notification.title}</span>
                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary ml-auto" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-center text-xs text-muted-foreground cursor-pointer"
              onClick={() => navigate('/notifications')}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Avatar className="h-8 w-8 bg-primary/10">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 bg-primary/10">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
              <span className="material-icons mr-2 text-sm">person</span>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <span className="material-icons mr-2 text-sm">settings</span>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <span className="material-icons mr-2 text-sm">logout</span>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 bg-primary/10">
                <AvatarFallback className="bg-primary/20 text-primary text-xl">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={!editName}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

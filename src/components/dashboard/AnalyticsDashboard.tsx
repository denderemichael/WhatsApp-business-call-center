import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

type DateRange = 'today' | '7days' | '30days' | '90days';

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const { 
    analyticsData, 
    adminDashboardStats,
    branches,
    reports,
    conversations,
  } = useChat();
  const [dateRange, setDateRange] = useState<DateRange>('7days');

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isBranchManager = user?.role === 'branch_manager';

  // Calculate date range bounds
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case '7days':
        return { startDate: startOfDay(subDays(now, 7)), endDate: endOfDay(now) };
      case '30days':
        return { startDate: startOfDay(subDays(now, 30)), endDate: endOfDay(now) };
      case '90days':
        return { startDate: startOfDay(subDays(now, 90)), endDate: endOfDay(now) };
      default:
        return { startDate: startOfDay(subDays(now, 7)), endDate: endOfDay(now) };
    }
  }, [dateRange]);

  // Filter conversations based on date range
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const convDate = new Date(conv.lastMessageTime);
      return isWithinInterval(convDate, { start: startDate, end: endDate });
    });
  }, [conversations, startDate, endDate]);

  // Calculate metrics based on filtered conversations
  const filteredMetrics = useMemo(() => {
    const total = filteredConversations.length;
    const resolved = filteredConversations.filter(c => c.status === 'resolved' || c.status === 'closed').length;
    const escalated = filteredConversations.filter(c => c.status === 'escalated').length;
    const newCount = filteredConversations.filter(c => c.status === 'new').length;
    
    return {
      totalConversations: total,
      resolvedConversations: resolved,
      escalatedConversations: escalated,
      newConversations: newCount,
    };
  }, [filteredConversations]);



  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'System-wide analytics and reporting' : 'Branch performance metrics'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Admin Overview - Only for Admin */}
      {isAdmin && adminDashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Branches</p>
                  <p className="text-3xl font-bold">{adminDashboardStats.totalBranches}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Agents</p>
                  <p className="text-3xl font-bold">{adminDashboardStats.totalAgents}</p>
                </div>
                <div className="flex gap-1">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  {adminDashboardStats.agentsOnline} online
                </span>
                <span className="flex items-center gap-1 text-gray-500">
                  <ArrowDownRight className="h-3 w-3" />
                  {adminDashboardStats.agentsOffline} offline
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Chats</p>
                  <p className="text-3xl font-bold">{adminDashboardStats.totalConversationsToday}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {adminDashboardStats.escalatedConversations} escalated
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reports</p>
                  <p className="text-3xl font-bold">{adminDashboardStats.pendingReports}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Awaiting review
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Conversations</p>
                <p className="text-3xl font-bold">{filteredMetrics.totalConversations}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              +12% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-3xl font-bold">{analyticsData.metrics.averageResponseTime}m</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
              <ArrowDownRight className="h-4 w-4" />
              -8% faster
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
                <p className="text-3xl font-bold">
                  {filteredMetrics.totalConversations > 0 ? Math.round((filteredMetrics.resolvedConversations / filteredMetrics.totalConversations) * 100) : 0}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              +5% improvement
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
                <p className="text-3xl font-bold">{analyticsData.metrics.customerSatisfaction}/5</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              +0.3 from last period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Conversations by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversations by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.conversationsByStatus.map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${(item.count / analyticsData.metrics.totalConversations) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Conversations by Tag */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversations by Tag</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.conversationsByTag.map((item) => (
                    <div key={item.tag} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.tag}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${(item.count / analyticsData.metrics.totalConversations) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Conversations ({filteredConversations.length} in range)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No conversations found in the selected date range</p>
                  </div>
                ) : (
                  filteredConversations.slice(0, 10).map((conv) => (
                    <div key={conv.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{conv.customerName}</p>
                        <p className="text-sm text-muted-foreground">{conv.lastMessage}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={conv.status === 'escalated' ? 'destructive' : 'outline'}>
                          {conv.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(conv.lastMessageTime), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                   ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analyticsData.agentMetrics.online}</p>
                    <p className="text-sm text-muted-foreground">Agents Online</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analyticsData.agentMetrics.busy}</p>
                    <p className="text-sm text-muted-foreground">Agents Busy</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analyticsData.agentMetrics.offline}</p>
                    <p className="text-sm text-muted-foreground">Agents Offline</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Recent Reports
                {isBranchManager && (
                  <Button size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    New Report
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.branchId === 'branch-1' ? 'Harare CBD' : 
                         report.branchId === 'branch-2' ? 'Chitungwiza' : 'Bulawayo'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.status === 'submitted' ? 'outline' : 'secondary'}>
                        {report.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(report.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}





# Implementation Plan - WhatsApp Agent Contact Centre Dashboard

## Approach
Frontend-first with mock WhatsApp integration for demo/prototyping. Backend integration can be added later when ready.

## Updated MVP Scope (Frontend Only)

### Phase 1: Cleanup & Foundation (Day 1)
- [ ] Remove Lovable template references (README.md cleanup)
- [ ] Update package.json with proper project metadata
- [ ] Clean up App.tsx and remove Lovable-specific imports
- [ ] Set up proper project structure

### Phase 2: Enhanced Dashboard Features (Days 2-4)
- [ ] **Routing Engine**: Implement conversation routing rules UI
- [ ] **Customer 360 Panel**: Enhanced customer profile view with history timeline
- [ ] **Workflow Templates**: Quick replies and canned responses system
- [ ] **Agent Management**: Complete agent status and assignment UI
- [ ] **Analytics Dashboard**: Charts and metrics for managers/admins

### Phase 3: Real-time Simulation (Days 5-6)
- [ ] Simulate incoming messages with WebSocket-like mock service
- [ ] Desktop notifications for new messages
- [ ] Typing indicators simulation
- [ ] Agent status toggle with presence indicators

### Phase 4: Audit & Compliance (Day 7)
- [ ] Audit log panel showing all actions
- [ ] Conversation history timeline
- [ ] Action history for customer records

### Phase 5: Polish & Demo (Days 8-10)
- [ ] Enhanced UI/UX improvements
- [ ] Responsive design fixes
- [ ] Performance optimization
- [ ] Demo mode with sample data

## File Structure
```
src/
├── api/                    # Mock API services
│   ├── whatsapp.ts         # Mock WhatsApp service
│   ├── conversations.ts    # Conversation API
│   ├── customers.ts        # Customer API
│   └── analytics.ts        # Analytics API
├── components/
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx
│   │   ├── ConversationList.tsx  # Enhanced
│   │   ├── ChatWindow.tsx          # Enhanced
│   │   ├── CustomerContextPanel.tsx # Enhanced
│   │   ├── CustomerProfilePanel.tsx # NEW
│   │   ├── WorkflowTemplates.tsx   # NEW
│   │   ├── AgentManagement.tsx     # NEW
│   │   ├── AnalyticsDashboard.tsx  # NEW
│   │   └── AuditLogPanel.tsx       # NEW
│   └── ui/                 # Existing shadcn components
├── contexts/
│   ├── AuthContext.tsx     # Enhanced with more features
│   ├── ChatContext.tsx     # Enhanced with routing
│   ├── NotificationContext.tsx # NEW
│   └── WebSocketContext.tsx # NEW (mock)
├── hooks/
│   ├── useWhatsApp.ts      # NEW
│   ├── useRouting.ts       # NEW
│   └── useNotifications.ts # NEW
├── lib/
│   ├── routing.ts          # NEW - routing rules engine
│   ├── templates.ts        # NEW - workflow templates
│   └── analytics.ts        # NEW - analytics calculations
├── types/
│   └── index.ts            # Enhanced with new types
├── pages/
│   ├── Dashboard.tsx       # Enhanced
│   ├── Login.tsx           # Enhanced
│   ├── Analytics.tsx       # NEW
│   ├── Agents.tsx          # NEW
│   └── Settings.tsx        # NEW
└── data/
    └── mockData.ts         # Enhanced with more realistic data
```

## New Types to Add
```typescript
// Routing
interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  condition: RoutingCondition;
  action: RoutingAction;
  isActive: boolean;
}

interface RoutingCondition {
  field: 'phone' | 'tags' | 'message' | 'time' | 'customer_segment';
  operator: 'equals' | 'contains' | 'starts_with' | 'regex';
  value: string;
}

interface RoutingAction {
  type: 'assign_branch' | 'assign_agent' | 'assign_queue' | 'escalate' | 'auto_reply';
  targetId: string;
}

// Customer Profile
interface CustomerProfile {
  id: string;
  phone: string;
  name: string;
  email?: string;
  segments: ('vip' | 'new' | 'returning' | 'high_value')[];
  totalConversations: number;
  totalMessages: number;
  averageResponseTime: number;
  satisfactionScore?: number;
  customFields: Record<string, any>;
  conversationHistory: ConversationSummary[];
  createdAt: Date;
  lastContactAt: Date;
}

// Workflow Templates
interface WorkflowTemplate {
  id: string;
  title: string;
  content: string;
  category: 'greeting' | 'closing' | 'faq' | 'issue_resolution' | 'escalation';
  tags: string[];
  branchId?: string;
  usageCount: number;
  createdAt: Date;
}

// Audit Log
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  resourceType: 'conversation' | 'customer' | 'agent';
  resourceId: string;
  details: string;
}

// Analytics
interface AnalyticsMetrics {
  totalConversations: number;
  activeConversations: number;
  resolvedToday: number;
  averageResponseTime: number;
  averageHandleTime: number;
  customerSatisfaction: number;
  conversationsByBranch: { branchId: string; count: number }[];
  conversationsByStatus: { status: string; count: number }[];
  topAgents: { agentId: string; name: string; resolvedCount: number }[];
}
```

## Priority Features for Demo

### Must Have (P0)
1. ✅ Enhanced Conversation List with filtering
2. ✅ Chat Window with rich messaging
3. ✅ Customer Profile Panel with history
4. ✅ Branch/Agent routing simulation
5. ✅ Quick Replies templates

### Should Have (P1)
1. Agent Performance metrics
2. Real-time notification simulation
3. Conversation escalation workflow
4. Internal notes with timestamps

### Nice to Have (P2)
1. Full analytics dashboard
2. Knowledge base integration
3. Advanced search
4. Export reports

## Next Steps
1. Confirm this plan meets your expectations
2. Switch to Code mode to begin implementation
3. Start with cleanup and foundation work

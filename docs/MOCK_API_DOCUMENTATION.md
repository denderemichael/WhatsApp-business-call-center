# Mock API Layer Documentation

## Overview

The Mock API Layer provides a full-featured fake backend for the WhatsApp Agent Contact Centre Dashboard. It simulates real API behavior including authentication, role-based permissions, SLA tracking, escalation flows, and audit logging.

## File Structure

```
src/
├── services/
│   └── mockApiService.ts    # Main Mock API Service class
├── hooks/
│   └── useMockApi.ts        # React hook for consuming the API
├── context/
│   └── ApiContext.tsx        # Context provider for API integration
└── types/
    └── index.ts             # Comprehensive type definitions
```

## Key Features

### 1. Stateful Backend Simulation
- In-memory data storage that persists during the session
- Simulated network latency (configurable)
- Real-time dashboard sync via subscription

### 2. Role-Based Access Control
Three user roles with different permissions:

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all resources |
| **Branch Manager** | Manage conversations, tasks, reports in their branch |
| **Agent** | View/manage assigned conversations and tasks |

### 3. SLA Tracking
Automatic SLA breach monitoring with configurable thresholds:
- Response time tracking
- Resolution time tracking  
- Auto-escalation on breach
- Warning notifications at 80% of SLA time

### 4. Escalation Flow
Multi-level escalation system:
- Level 1: Supervisor
- Level 2: Branch Manager
- Level 3: Department Head
- Admin: Executive level

### 5. Audit Logging
Complete audit trail for all actions:
- User login/logout
- Conversation operations
- Task assignments
- Report submissions
- SLA breaches

## Usage

### Basic Usage with Hook

```typescript
import { useMockApi, MOCK_USERS } from '@/hooks/useMockApi';

function MyComponent() {
  const {
    currentUser,
    isAuthenticated,
    login,
    logout,
    conversations,
    fetchConversations,
    agents,
    branches,
    isLoading,
    error,
  } = useMockApi({ autoLogin: true });

  // Login
  const handleLogin = async () => {
    await login(MOCK_USERS.admin.email);
  };

  // Fetch data
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
      fetchAgents();
    }
  }, [isAuthenticated]);

  return (
    <div>
      {isLoading ? <Loading /> : (
        <ul>
          {conversations.map(c => (
            <li key={c.id}>{c.customerName}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Using the Context Provider

```typescript
import { ApiProvider, useApi } from '@/context/ApiContext';

function App() {
  return (
    <ApiProvider autoLogin={true}>
      <Dashboard />
    </ApiProvider>
  );
}

function Dashboard() {
  const { loginAsAdmin, loginAsManager, lastSync } = useApi();
  
  return (
    <div>
      <p>Last sync: {lastSync?.toLocaleString()}</p>
      <button onClick={loginAsAdmin}>Login as Admin</button>
    </div>
  );
}
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `login(email, password)` | Authenticate user |
| POST | `logout()` | Logout current user |
| GET | `getCurrentUser()` | Get current user info |

### Branches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `getBranches()` | Get all branches (filtered by role) |
| GET | `getBranchById(id)` | Get branch details |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `getAgents(filters?)` | Get agents (filtered by role) |
| GET | `getAgentById(id)` | Get agent details |
| PATCH | `updateAgent(id, updates)` | Update agent status |
| PATCH | `reassignAgent(id, newBranch)` | Reassign agent to branch |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `getConversations(filters?)` | Get conversations with pagination |
| GET | `getConversationById(id)` | Get conversation details |
| POST | `createConversation(data)` | Create new conversation |
| PATCH | `updateConversation(id, updates)` | Update conversation |
| POST | `assignConversation(id, agentId)` | Assign to agent |
| POST | `transferConversation(id, agentId)` | Transfer to another agent |
| POST | `escalateConversation(data)` | Escalate conversation |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `sendMessage(conversationId, content, taskId?)` | Send message |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `getTasks(filters?)` | Get tasks |
| POST | `createTask(data)` | Create task |
| PATCH | `updateTaskStatus(id, status)` | Update task status |
| PATCH | `assignTask(id, agentId)` | Reassign task |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `getReports(filters?)` | Get reports |
| POST | `createReport(data)` | Create report |
| POST | `submitReport(id)` | Submit report for review |
| POST | `reviewReport(id, status, notes)` | Review report (admin) |

### Escalations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `getEscalations(filters?)` | Get escalations |
| POST | `escalateConversation(data)` | Create escalation |
| POST | `resolveEscalation(id, resolution)` | Resolve escalation |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `getNotifications()` | Get user notifications |
| POST | `markNotificationAsRead(id)` | Mark as read |
| POST | `markAllNotificationsAsRead()` | Mark all as read |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `getAdminDashboardStats()` | Get admin dashboard stats |
| GET | `getConversationStats()` | Get conversation statistics |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `healthCheck()` | Check API health |

## Mock Users

For testing, use these pre-configured users:

| Email | Role | Branch |
|-------|------|--------|
| admin@whatsapp-hub.com | Admin | All |
| michael@whatsapp-hub.com | Branch Manager | Harare CBD (branch-1) |
| tendai@whatsapp-hub.com | Branch Manager | Chitungwiza (branch-2) |
| grace@whatsapp-hub.com | Branch Manager | Bulawayo (branch-3) |
| james@whatsapp-hub.com | Agent | Harare CBD |
| emily@whatsapp-hub.com | Agent | Harare CBD |
| chipo@whatsapp-hub.com | Agent | Chitungwiza |
| tatenda@whatsapp-hub.com | Agent | Chitungwiza |
| rumbi@whatsapp-hub.com | Agent | Bulawayo |

## SLA Configuration

Default SLA times by priority:

| Priority | Response Time | Resolution Time |
|----------|---------------|-----------------|
| Urgent | 5 minutes | 1 hour |
| High | 15 minutes | 2 hours |
| Normal | 30 minutes | 4 hours |
| Low | 1 hour | 8 hours |

## Audit Events

All actions are logged with:
- Timestamp
- Performing user
- Action type
- Affected resources
- Metadata

Action types include:
- `conversation_created`, `conversation_assigned`, `conversation_transferred`
- `conversation_escalated`, `conversation_resolved`, `conversation_closed`
- `message_sent`, `message_received`
- `agent_status_changed`
- `task_created`, `task_assigned`, `task_updated`, `task_completed`
- `report_created`, `report_submitted`, `report_reviewed`
- `sla_breach`, `sla_warning`
- `user_login`, `user_logout`

## Real-time Features

### Dashboard Sync

```typescript
const { subscribeToSync } = useApi();

useEffect(() => {
  const unsubscribe = subscribeToSync(() => {
    // Data has been updated
    console.log('Dashboard synced');
  });
  
  return unsubscribe;
}, [subscribeToSync]);
```

### Simulated Customer Responses

When an agent sends a message, the mock API automatically simulates customer responses after 5-15 seconds.

## Configuration

### Latency Simulation

```typescript
// Set base latency (ms)
mockApi.setLatency(100, 50); // 100ms base + 50ms variance

// Or via hook
const { setLatency } = useApi();
setLatency(200);
```

### SLA Breach Monitoring

The SLA breach monitoring runs automatically every 30 seconds and:
1. Checks for breached response times
2. Checks for breached resolution times
3. Creates escalations for breached SLAs
4. Sends notifications to relevant parties

## Error Handling

All API methods return a standardized response:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

Common error codes:
- `INVALID_CREDENTIALS` - Authentication failed
- `PERMISSION_DENIED` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `AGENT_AT_CAPACITY` - Agent has too many chats
- `VALIDATION_ERROR` - Invalid input data

## Best Practices

1. **Use the hook for component-level data fetching**
2. **Use the context provider for app-wide state management**
3. **Set appropriate latency for testing (faster for dev, realistic for QA)**
4. **Enable SLA breach monitoring in staging environments**
5. **Use audit logs for debugging user actions**

## Migration Guide

To migrate from direct ChatContext usage to Mock API:

1. Wrap app with `ApiProvider`
2. Replace `useChat()` calls with `useApi()` for new features
3. Existing `useChat()` calls continue to work
4. Gradually migrate components to use the new API

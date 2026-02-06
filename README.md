# WhatsApp Agent Contact Centre Dashboard

A production-ready WhatsApp Agent Contact Centre Dashboard built with React, TypeScript, and modern best practices.

## Features

- **Multi-Branch Support**: Single WhatsApp number serving multiple branches
- **Role-Based Access**: Admin, Branch Manager, and Agent roles with specific permissions
- **Smart Routing**: Intelligent conversation routing to correct agents
- **Task Management**: Branch managers can assign specific tasks to agents
- **Customer 360**: Complete customer context and interaction history
- **Audit Logging**: Full traceability of all actions
- **Real-Time Updates**: Live conversation status and notifications
- **Analytics Dashboard**: Performance metrics and reporting

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5.x
- **UI Components**: shadcn/ui + Tailwind CSS
- **State Management**: React Context + TanStack Query
- **Routing**: React Router v6
- **Icons**: Google Material Icons
- **Date Handling**: date-fns

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Project Structure

```
src/
├── components/
│   ├── dashboard/        # Dashboard-specific components
│   └── ui/              # Reusable UI components
├── contexts/            # React Context providers
├── data/                # Mock data and fixtures
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── pages/               # Page components
└── types/               # TypeScript type definitions
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, view all branches, analytics, reports |
| **Branch Manager** | Manage agents, assign tasks, view branch analytics, create reports |
| **Agent** | Handle assigned conversations, reply to messages, update status |

## License

MIT License

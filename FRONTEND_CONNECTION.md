# Connecting Frontend to Backend - Complete Guide

## Overview

This guide explains how the frontend was updated to connect to the real Node.js + Express backend instead of using mock data.

## Changes Made

### 1. Updated `.env` (src/.env)
```env
VITE_API_URL=http://localhost:3000
```

### 2. Updated `App.tsx` (src/App.tsx)
- Replaced `ChatProvider` with `RealChatProvider`
- The app now uses real backend data

### 3. Updated `ConversationList.tsx` (src/components/dashboard/ConversationList.tsx)
- Added refresh button with loading spinner
- Shows error state when API fails
- Displays loading state while fetching conversations
- Uses `useRealChat()` hook for real-time data

### 4. Updated `ChatWindow.tsx` (src/components/dashboard/ChatWindow.tsx)
- Added sending state with loading spinner
- Shows error when message fails to send
- Auto-refreshes conversation when selected
- Uses `refreshCurrentConversation()` from real API

### 5. Updated `CustomerContextPanel.tsx` (src/components/dashboard/CustomerContextPanel.tsx)
- Added **Audit Logs** section showing activity history
- Fetches and displays audit logs from backend
- Shows who performed each action and when
- Refresh button to reload logs

## Files Reference

| File | Purpose |
|------|---------|
| `src/services/api.ts` | API service for all backend calls |
| `src/context/RealChatContext.tsx` | React context using real backend |
| `src/.env` | API configuration |
| `src/App.tsx` | Root component with providers |

## Quick Start

### 1. Start Backend

```bash
cd server
npm install
npm run dev   # Runs on http://localhost:3000
```

### 2. Start ngrok (for WhatsApp webhooks)

```bash
ngrok http 3000
```

### 3. Configure Twilio Sandbox

1. Go to Twilio Console → Messaging → Try It Out → Send a WhatsApp Message
2. Set webhook URL: `https://your-ngrok-url/webhooks/whatsapp`
3. Send `join <your-code>` to opt-in

### 4. Start Frontend

```bash
npm run dev   # Runs on http://localhost:5173
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  RealChatProvider                                 │  │
│  │  - Conversations from real API                    │  │
│  │  - Loading/error states                           │  │
│  │  - Auto-refresh enabled                          │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                     │
│         ┌────────┴────────┐                            │
│         ↓                 ↓                            │
│  ┌──────────────┐  ┌──────────────────────┐            │
│  │ Conversation │  │  CustomerContextPanel│            │
│  │ List         │  │  - Audit Logs        │            │
│  │ - Loading    │  │  - Activity History │            │
│  │ - Refresh    │  └──────────────────────┘            │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘
                   │
                   ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│              Backend (Express)                           │
│  - Routes: /cases, /messages, /users                     │
│  - Twilio webhook: /webhooks/whatsapp                  │
│  - Supabase database integration                         │
└─────────────────────────────────────────────────────────┘
                   │
          ┌────────┴────────┐
          ↓                 ↓
┌────────────────────┐  ┌────────────────────┐
│   Supabase DB      │  │   Twilio API       │
│   - cases         │  │   (WhatsApp)       │
│   - messages      │  │                    │
│   - audit_logs     │  └────────────────────┘
│   - users         │
│   - branches      │
└────────────────────┘
```

## API Endpoints Used

| Method | Endpoint | Used In |
|--------|----------|---------|
| GET | `/cases` | ConversationList |
| GET | `/cases/:id` | ChatWindow, CustomerContextPanel |
| GET | `/messages/case/:caseId` | ChatWindow |
| POST | `/messages/send` | ChatWindow |
| POST | `/cases/:id/assign` | CustomerContextPanel |
| GET | `/cases/:id/logs` | CustomerContextPanel (Audit Logs) |

## Features Enabled

### ConversationList
- ✅ Loading spinner while fetching
- ✅ Refresh button to reload
- ✅ Error display on failure
- ✅ Real-time data from backend

### ChatWindow
- ✅ Sending state with spinner
- ✅ Error display on failure
- ✅ Auto-refresh on conversation select
- ✅ Real message history

### CustomerContextPanel
- ✅ Audit logs section
- ✅ Activity history with icons
- ✅ Timestamps for each action
- ✅ Refresh logs button

## Switching Between Mock and Real

### Mock Mode (Not Available)
The app now uses the real backend by default.

### Real Mode (Active)
```tsx
// App.tsx
import { RealChatProvider } from '@/context/RealChatContext';

<RealChatProvider>
  <YourApp />
</RealChatProvider>
```

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL=http://localhost:5173` is set in backend `.env`

### Connection Refused
- Backend running on port 3000?
- No firewall blocking?

### Webhook Not Working
- ngrok running?
- Webhook URL correct in Twilio?

### 401 Unauthorized
- Auth token not yet implemented
- Backend uses mock auth for now

## Next Steps

1. ✅ Create API service
2. ✅ Create RealChatContext
3. ✅ Update components to use real data
4. ✅ Add audit logs to CustomerContextPanel
5. ⏳ Add Supabase Realtime subscriptions
6. ⏳ Add JWT authentication
7. ⏳ Deploy to production

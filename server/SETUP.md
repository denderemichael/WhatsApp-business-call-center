# WhatsApp Agent Contact Centre Backend - Setup Guide

## Step 1: Install Dependencies

Navigate to the server directory and install dependencies:

```bash
cd server
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project" and fill in the details
3. Wait for the project to be created (takes ~2 minutes)

### 2.2 Run Database Migration
1. Go to your Supabase project's SQL Editor
2. Copy and run the SQL from `scripts/schema.sql`

### 2.3 Add Seed Data (Optional)
```sql
-- Insert sample branches
INSERT INTO branches (name, location, whatsapp_number) VALUES 
  ('Harare CBD', 'First Street, Harare', '+263712345678'),
  ('North Branch', 'Avondale, Harare', '+263798765432'),
  ('South Branch', 'Highfield, Harare', '+263787654321');

-- Insert sample users
INSERT INTO users (name, email, role, branch_id, status) VALUES 
  ('Admin User', 'admin@example.com', 'admin', NULL, 'online'),
  ('Branch Manager', 'manager@example.com', 'manager', (SELECT id FROM branches WHERE name = 'Harare CBD'), 'online'),
  ('Agent John', 'john@example.com', 'agent', (SELECT id FROM branches WHERE name = 'Harare CBD'), 'online'),
  ('Agent Emily', 'emily@example.com', 'agent', (SELECT id FROM branches WHERE name = 'Harare CBD'), 'busy'),
  ('Agent Chipo', 'chipo@example.com', 'agent', (SELECT id FROM branches WHERE name = 'North Branch'), 'online'),
  ('Agent Rumbidzai', 'rumbi@example.com', 'agent', (SELECT id FROM branches WHERE name = 'South Branch'), 'online');
```

## Step 3: Set Up Twilio WhatsApp Sandbox

### 3.1 Create Twilio Account
1. Go to [twilio.com](https://twilio.com) and sign up for free
2. Verify your email and phone number
3. Get your Account SID and Auth Token from the console

### 3.2 Activate WhatsApp Sandbox
1. Go to **Messaging** → **Try It Out** → **Send a WhatsApp Message**
2. Click **Sandbox Settings**
3. Enter your WhatsApp number and click **Save**
4. Note your **Sandbox Name** (e.g., `willing-unicorn-345`)
5. Send a WhatsApp message to the sandbox number with:
   ```
   join <your-sandbox-name>
   ```
   Example: `join willing-unicorn-345`
6. You'll receive a confirmation that your number is opted-in

### 3.3 Get Sandbox Credentials
From the Sandbox Settings page, note:
- **Sandbox Number** (usually `whatsapp:+14155238886`)
- **Account SID** (from console.twilio.com)
- **Auth Token** (from console.twilio.com)

### 3.4 Configure Webhook
1. In Sandbox Settings, find **"When a message comes in"**
2. Set URL: `https://your-domain.com/webhooks/whatsapp`
3. Set Method: `POST`
4. Click **Save**

## Step 4: Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=your_secure_jwt_secret

# Twilio WhatsApp Sandbox Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886
TWILIO_WHATSAPP_NUMBER=+14155238886
TWILIO_WEBHOOK_AUTH_TOKEN=optional_webhook_verification_token

# Welcome Message (Mukuru-style menu)
WELCOME_MESSAGE=Welcome to X Support 🎧

Please select an option:
1. New Order
2. Check Existing Order
3. Account Help
4. Talk to an Agent

Reply with the number (1-4)
```

## Step 5: Start the Server

### Development Mode
```bash
cd server
npm install
npm run dev
```

The server will start at `http://localhost:3000`

### Production Build
```bash
npm run build
npm start
```

## Step 6: Test Webhook

### Local Testing with ngrok
1. Download and install [ngrok](https://ngrok.com/)
2. Start ngrok tunnel:
   ```bash
   ngrok http 3000
   ```
3. Note your ngrok URL (e.g., `https://abc123.ngrok.io`)
4. Update your Twilio Sandbox webhook with:
   - URL: `https://abc123.ngrok.io/webhooks/whatsapp`
   - Method: `POST`

### Test the Flow
1. Send a WhatsApp message to the sandbox number
2. You should receive the welcome menu
3. Check Supabase - new customer and case should be created
4. Reply to the message - it should be added to the same conversation

### Troubleshooting Sandbox
- **Not receiving messages?** Make sure you sent `join <sandbox-name>` to opt-in
- **Can't send messages?** Only opted-in numbers can receive from sandbox
- **Wrong webhook URL?** Update in Sandbox Settings page

## Sandbox vs Production

| Feature | Sandbox | Production |
|---------|---------|------------|
| Cost | Free | Pay-per-message |
| Participants | Manual opt-in | Any WhatsApp user |
| Templates | None | Pre-approved templates |
| Setup Time | Minutes | Days (approval required) |
| Webhook | Works | Works |
| Quick Replies | Text alternatives | Interactive buttons |

## API Endpoints

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhooks/whatsapp` | Webhook verification |
| POST | `/webhooks/whatsapp` | Receive incoming WhatsApp messages |
| POST | `/webhooks/whatsapp/status` | Message status callbacks |

### Cases
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/cases` | List cases (with filters) | Required |
| GET | `/cases/pending` | Get unassigned cases | Manager |
| GET | `/cases/:id` | Get single case | Required |
| POST | `/cases/:id/assign` | Assign agent to case | Manager |

### Messages
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/messages/case/:caseId` | Get messages for a case | Required |
| POST | `/messages/send` | Send WhatsApp message | Required |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Current user | Required |
| GET | `/users/branches` | List branches | Required |
| GET | `/users/agents` | List agents | Required |

## Message Flow

### New Customer Flow
```
Customer sends message to sandbox
    ↓
Twilio webhook receives it
    ↓
Backend checks for existing open case
    ↓
If new: Create case + customer record
    ↓
Send welcome menu (system message)
    ↓
Case appears in "Unassigned" list
```

### Manager Assigns Agent
```
Manager sees unassigned case
    ↓
Selects agent from branch
    ↓
Backend updates case:
  - assigned_agent_id = agent_id
  - status = 'assigned'
  - assigned_at = now()
    ↓
Send notification to customer
    ↓
Agent sees case in their inbox
```

### Agent Replies
```
Agent types message in dashboard
    ↓
Backend sends via Twilio API
    ↓
Customer receives from sandbox number
    ↓
Message stored with sender_type = 'agent'
```

## Production Upgrade

When ready to go live:

1. **Get WhatsApp Business Account**
   - Apply through Twilio for WhatsApp Business API
   - Requires business verification

2. **Pre-approve Message Templates**
   - Create templates in Meta/Facebook Business Manager
   - Submit for approval

3. **Update Credentials**
   - Replace sandbox number with business number
   - Update `.env` file

4. **Configure Business Webhook**
   - New webhook URL (production)
   - Verify with Meta

## Troubleshooting

### Webhook Not Receiving Messages
- Verify ngrok tunnel is running
- Check webhook URL is correct in Twilio Sandbox settings
- Ensure server is running on port 3000
- Check firewall allows incoming connections

### Messages Not Sending
- Verify Twilio credentials are correct
- Check that number has joined the sandbox
- Ensure message format is correct
- Check Twilio console for error logs

### Database Errors
- Verify Supabase credentials in `.env`
- Ensure all tables are created
- Check RLS policies if using them

## Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Use HTTPS for webhook endpoints
- [ ] Configure proper domain in Twilio webhook
- [ ] Set up monitoring and alerting
- [ ] Configure CORS for production domain
- [ ] Set up proper logging
- [ ] Apply for WhatsApp Business API for production

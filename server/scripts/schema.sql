-- WhatsApp Agent Contact Centre Database Schema
-- Run this in your Supabase SQL Editor

-- =============================================
-- TABLES
-- =============================================

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (agents and managers)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'agent')) DEFAULT 'agent',
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('online', 'busy', 'offline')) DEFAULT 'offline',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table (track customer information)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_at TIMESTAMPTZ,
  total_conversations INTEGER DEFAULT 0
);

-- Create cases table (conversations)
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('new', 'open', 'assigned', 'pending', 'resolved', 'closed')) DEFAULT 'new',
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  first_message TEXT,
  last_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('customer', 'agent', 'system')) NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'image', 'document', 'system', 'template')) DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_branch_id ON cases(branch_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_agent_id ON cases(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_cases_customer_phone ON cases(customer_phone);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_messages_case_id ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_last_contact ON customers(last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================
-- SEED DATA (Optional)
-- =============================================

-- Insert sample branches
INSERT INTO branches (name, location, whatsapp_number) VALUES 
  ('Harare CBD', 'First Street, Harare', '+263712345678'),
  ('North Branch', 'Avondale, Harare', '+263798765432'),
  ('South Branch', 'Highfield, Harare', '+263787654321')
ON CONFLICT DO NOTHING;

-- Insert sample users (passwords should be hashed in production)
INSERT INTO users (name, email, role, branch_id, status) VALUES 
  ('Admin User', 'admin@example.com', 'admin', NULL, 'online'),
  ('Branch Manager', 'manager@example.com', 'manager', (SELECT id FROM branches WHERE name = 'Harare CBD'), 'online'),
  ('Agent John', 'john@example.com', 'agent', (SELECT id FROM branches WHERE name = 'Harare CBD'), 'online'),
  ('Agent Emily', 'emily@example.com', 'agent', (SELECT id FROM branches WHERE name = 'Harare CBD'), 'busy'),
  ('Agent Chipo', 'chipo@example.com', 'agent', (SELECT id FROM branches WHERE name = 'North Branch'), 'online'),
  ('Agent Rumbidzai', 'rumbi@example.com', 'agent', (SELECT id FROM branches WHERE name = 'South Branch'), 'online')
ON CONFLICT DO NOTHING;

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- Function to update customer last_contact_at
CREATE OR REPLACE FUNCTION update_customer_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers 
  SET last_contact_at = NOW(),
      total_conversations = total_conversations + 1
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer last contact
DROP TRIGGER IF EXISTS cases_customer_update ON cases;
CREATE TRIGGER cases_customer_update
  AFTER INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_last_contact();

-- =============================================
-- ROW LEVEL SECURITY (Optional)
-- =============================================

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all data
CREATE POLICY "Admins can view all branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Admins can manage all branches" ON branches FOR ALL USING (true);

-- Users can view their own data
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);

-- Cases visible based on branch and assignment
CREATE POLICY "Agents can view assigned cases" ON cases FOR SELECT USING (
  assigned_agent_id = auth.uid() OR 
  branch_id IN (SELECT branch_id FROM users WHERE id = auth.uid())
);

-- Messages visible based on case access
CREATE POLICY "Users can view messages for accessible cases" ON messages FOR SELECT USING (
  case_id IN (SELECT id FROM cases WHERE assigned_agent_id = auth.uid())
);

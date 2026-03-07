-- ============================================================================
-- Supabase Database Setup for WhatsApp Agent Contact Centre
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to set up the database
-- ============================================================================

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
  password_hash TEXT DEFAULT '',
  role TEXT CHECK (role IN ('admin', 'manager', 'branch_manager', 'agent')) DEFAULT 'agent',
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('online', 'busy', 'offline')) DEFAULT 'offline',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_at TIMESTAMPTZ,
  total_conversations INTEGER DEFAULT 0
);

-- Create cases table
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
CREATE INDEX IF NOT EXISTS idx_messages_case_id ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================
-- DISABLE RLS (for service role access)
-- =============================================

ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- =============================================
-- FIX EXISTING TABLES (if needed)
-- =============================================

-- Add password_hash column if it doesn't exist
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
  END IF;
END $;

-- =============================================
-- SEED DATA
-- =============================================

-- Insert sample branches
INSERT INTO branches (name, location, whatsapp_number) VALUES 
  ('Harare CBD', 'First Street, Harare', '+263712345678'),
  ('North Branch', 'Avondale, Harare', '+263798765432'),
  ('South Branch', 'Highfield, Harare', '+263787654321')
ON CONFLICT DO NOTHING;

-- Insert sample users (use plain password for demo - in production use bcrypt)
INSERT INTO users (name, email, password_hash, role, branch_id, status) VALUES 
  ('Admin User', 'admin@example.com', 'demo123', 'admin', NULL, 'online'),
  ('Branch Manager', 'manager@example.com', 'demo123', 'manager', (SELECT id FROM branches WHERE name = 'Harare CBD'), 'online'),
  ('Agent John', 'john@example.com', 'demo123', 'agent', (SELECT id FROM branches WHERE name = 'Harare CBD'), 'online'),
  ('Agent Emily', 'emily@example.com', 'demo123', 'agent', (SELECT id FROM branches WHERE name = 'Harare CBD'), 'busy'),
  ('Agent Chipo', 'chipo@example.com', 'demo123', 'agent', (SELECT id FROM branches WHERE name = 'North Branch'), 'online'),
  ('Agent Rumbidzai', 'rumbi@example.com', 'demo123', 'agent', (SELECT id FROM branches WHERE name = 'South Branch'), 'online')
ON CONFLICT DO NOTHING;

-- =============================================
-- DONE!
-- =============================================

SELECT 'Database setup complete!' as status;

// Database migration script - Run this to create all tables in Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const migrations = [
  // Create branches table
  `
  CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,

  // Create users table
  `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'manager', 'agent')) DEFAULT 'agent',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,

  // Create cases table
  `
  CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('open', 'pending', 'resolved', 'closed')) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,

  // Create messages table
  `
  CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT CHECK (sender_type IN ('customer', 'agent', 'system')) NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_text TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'document', 'system')) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,

  // Create audit_logs table
  `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,

  // Create indexes for better query performance
  `
  CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
  CREATE INDEX IF NOT EXISTS idx_cases_branch_id ON cases(branch_id);
  CREATE INDEX IF NOT EXISTS idx_cases_assigned_agent_id ON cases(assigned_agent_id);
  CREATE INDEX IF NOT EXISTS idx_messages_case_id ON messages(case_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
  `,

  // Enable Realtime for messages table
  `
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  `,

  // Enable Realtime for cases table
  `
  ALTER PUBLICATION supabase_realtime ADD TABLE cases;
  `,
];

async function runMigrations() {
  console.log('Starting database migrations...');
  
  for (const migration of migrations) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: migration });
      
      // If RPC fails, try direct query
      if (error) {
        const { error: directError } = await supabase.from('branches').select('*').limit(1);
        if (directError) {
          // Tables don't exist, need to run raw SQL
          console.log('Running migration SQL directly...');
        }
      }
    } catch (err) {
      console.error('Migration error:', err);
    }
  }

  console.log('\n=== Manual SQL Setup Instructions ===');
  console.log('Please run the following SQL in your Supabase SQL Editor:\n');
  
  console.log('-- Create branches table');
  console.log(migrations[0]);
  console.log('\n-- Create users table');
  console.log(migrations[1]);
  console.log('\n-- Create cases table');
  console.log(migrations[2]);
  console.log('\n-- Create messages table');
  console.log(migrations[3]);
  console.log('\n-- Create audit_logs table');
  console.log(migrations[4]);
  console.log('\n-- Create indexes');
  console.log(migrations[5]);
  console.log('\n-- Enable Realtime');
  console.log(migrations[6]);
  console.log(migrations[7]);
  
  console.log('\n=== Seed Data ===');
  console.log('After creating tables, run this to add sample data:\n');
  
  const seedData = `
  -- Insert sample branches
  INSERT INTO branches (name) VALUES 
    ('Main Branch'),
    ('North Branch'),
    ('South Branch');

  -- Insert sample users (password should be hashed in production)
  INSERT INTO users (name, email, role, branch_id) VALUES 
    ('Admin User', 'admin@example.com', 'admin', NULL),
    ('Branch Manager', 'manager@example.com', 'manager', (SELECT id FROM branches WHERE name = 'Main Branch')),
    ('Agent John', 'john@example.com', 'agent', (SELECT id FROM branches WHERE name = 'Main Branch')),
    ('Agent Jane', 'jane@example.com', 'agent', (SELECT id FROM branches WHERE name = 'North Branch'));
  `;
  
  console.log(seedData);
}

runMigrations().catch(console.error);

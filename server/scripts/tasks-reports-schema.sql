-- ============================================================================
-- Database Schema for Tasks and Reports Module
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- =============================================
-- TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  
  -- Assignment
  assigned_to_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  -- Case reference (optional)
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  
  -- Dates
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- REPORTS TABLE (Escalations)
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'normal', 'high', 'critical')) DEFAULT 'normal',
  status TEXT CHECK (status IN ('draft', 'submitted', 'under_review', 'resolved', 'rejected')) DEFAULT 'draft',
  
  -- References
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  reported_by_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_by_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Admin response
  admin_response TEXT,
  
  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_branch ON tasks(branch_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_reports_branch ON reports(branch_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_by_manager ON reports(reported_by_manager_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_by_agent ON reports(reported_by_agent_id);

-- =============================================
-- DISABLE RLS (for service role access)
-- =============================================
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

-- =============================================
-- SEED SAMPLE DATA (Optional)
-- =============================================

SELECT 'Tasks and Reports tables created successfully!' as status;

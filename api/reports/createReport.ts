import type { VercelRequest, VercelResponse } from '../types/vercel';
import { supabaseAdmin } from '../../lib/supabaseClient';

interface CreateReportRequestBody {
  title: string;
  description?: string;
  urgency?: 'low' | 'normal' | 'high' | 'critical';
  case_id?: string;
  branch_id?: string;
}

/**
 * Map frontend status to backend status
 * submitted -> pending, approved -> resolved, rejected -> rejected
 */
function mapStatusToBackend(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'draft',
    'submitted': 'pending',
    'approved': 'resolved',
    'rejected': 'rejected',
  };
  return statusMap[status] || 'pending';
}

/**
 * Create Report Handler
 * POST /api/reports/createReport
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  // Only allow POST requests
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Get user from auth header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      response.status(401).json({ error: 'Authorization required' });
      return;
    }

    // Handle both string and string[] types for authorization header
    const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const token = authValue.replace('Bearer ', '');
    
    // Verify the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      response.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Get user's role from users table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role, branch_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      response.status(403).json({ error: 'User profile not found' });
      return;
    }

    const userRole = profileData.role;
    const userBranchId = profileData.branch_id;

    // Only managers can create reports
    if (!['admin', 'manager', 'branch_manager'].includes(userRole)) {
      response.status(403).json({ error: 'Only managers and admins can create reports' });
      return;
    }

    const { title, description, urgency = 'normal', case_id, branch_id } = request.body as CreateReportRequestBody;

    // Validate required fields
    if (!title) {
      response.status(400).json({ error: 'Title is required' });
      return;
    }

    // Use the user's branch if no branch_id provided
    const reportBranchId = branch_id || userBranchId;

    // Map status to backend format
    const backendStatus = mapStatusToBackend('submitted');

    // Create the report
    const { data: reportData, error: reportError } = await supabaseAdmin
      .from('reports')
      .insert({
        title,
        description,
        urgency,
        case_id,
        branch_id: reportBranchId,
        reported_by_manager_id: user.id,
        status: backendStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (reportError) {
      console.error('Report creation error:', reportError);
      response.status(500).json({ error: 'Failed to create report' });
      return;
    }

    response.status(201).json({
      message: 'Report created successfully',
      report: reportData,
    });
  } catch (error) {
    console.error('Create report error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

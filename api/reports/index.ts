import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { supabaseAdmin } from '../../lib/supabaseClient.js';

interface ReportFilters {
  status?: string;
  branch_id?: string;
  limit?: number;
  offset?: number;
}

interface CreateReportBody {
  title: string;
  description?: string;
  urgency?: string;
  case_id?: string;
  branch_id?: string;
}

/**
 * Map backend status to frontend status
 * pending -> submitted, under_review -> submitted, resolved -> approved
 */
function mapReportStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'draft',
    'submitted': 'submitted',
    'pending': 'submitted',
    'under_review': 'submitted',
    'resolved': 'approved',
    'rejected': 'rejected',
  };
  return statusMap[status] || 'submitted';
}

/**
 * Unified Reports Handler
 * Handles:
 * - GET /api/reports - list reports
 * - POST /api/reports - create report
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
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

    // GET /reports - list reports
    if (request.method === 'GET') {
      // Build query based on filters and role - no foreign key joins (relationships may not exist)
      let query = supabaseAdmin
        .from('reports')
        .select('*');

      // Apply role-based filtering
      if (userRole === 'agent') {
        // Agents can't see reports
        response.status(403).json({ error: 'Agents are not authorized to view reports' });
        return;
      } else if (userRole === 'branch_manager' || userRole === 'manager') {
        // Managers see reports from their branch OR reports they created
        if (userBranchId) {
          // Use OR to show both: reports from branch + reports created by this manager
          query = query.or(`branch_id.eq.${userBranchId},reported_by_manager_id.eq.${user.id}`);
        } else {
          // If no branch, only see their own reports
          query = query.eq('reported_by_manager_id', user.id);
        }
      }
      // Admins see all reports (no filter)

      // Apply additional filters from query params
      const { status, branch_id, limit = 50, offset = 0 } = request.query as ReportFilters;
      
      if (status) {
        // Map frontend status to backend status for filtering
        const reverseStatusMap: Record<string, string> = {
          'draft': 'draft',
          'submitted': 'pending',
          'approved': 'resolved',
          'rejected': 'rejected',
        };
        const backendStatus = reverseStatusMap[status] || status;
        query = query.eq('status', backendStatus);
      }
      
      if (branch_id && userRole === 'admin') {
        query = query.eq('branch_id', branch_id);
      }

      // Execute query with pagination
      const { data: reports, error: reportsError } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (reportsError) {
        console.error('Reports fetch error:', reportsError);
        response.status(500).json({ error: 'Failed to fetch reports' });
        return;
      }

      // Map status to frontend format
      const mappedReports = (reports || []).map((report: any) => ({
        ...report,
        status: mapReportStatus(report.status),
        id: report.id,
        branchId: report.branch_id,
        submittedBy: report.reported_by_manager_id,
        reportType: 'custom',
        title: report.title,
        content: report.description,
        metrics: {
          totalConversations: 0,
          resolvedConversations: 0,
          escalatedConversations: 0,
          averageResponseTime: 0,
          averageResolutionTime: 0,
          customerSatisfaction: 0,
          agentPerformance: [],
        },
        createdAt: report.created_at,
        submittedAt: report.created_at,
        reviewedBy: report.assigned_to_admin_id,
        adminNotes: report.admin_response,
      }));

      response.status(200).json({
        reports: mappedReports,
      });
      return;
    }

    // POST /reports - create report
    if (request.method === 'POST') {
      // Only managers can create reports
      if (!['admin', 'manager', 'branch_manager'].includes(userRole)) {
        response.status(403).json({ error: 'Only managers and admins can create reports' });
        return;
      }

      const body = request.body as CreateReportBody;
      const { title, description, urgency = 'normal', case_id, branch_id } = body;

      // Validate required fields
      if (!title) {
        response.status(400).json({ error: 'Title is required' });
        return;
      }

      // Use the user's branch if no branch_id provided
      const reportBranchId = branch_id || userBranchId;

      // Map status to backend format - use 'submitted' (not 'pending' which violates constraint)
      const backendStatus = 'submitted';

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
      return;
    }

    // Method not allowed
    response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Reports error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

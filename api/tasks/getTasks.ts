import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { supabaseAdmin } from '../../lib/supabaseClient.js';

interface TaskFilters {
  status?: string;
  branch_id?: string;
  assigned_agent_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Map backend status to frontend status
 * pending -> submitted, in_progress -> in_progress, completed -> approved
 */
function mapTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'submitted',
    'in_progress': 'in_progress',
    'completed': 'approved',
    'cancelled': 'rejected',
  };
  return statusMap[status] || status;
}

/**
 * Get Tasks Handler
 * GET /api/tasks/getTasks
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  // Only allow GET requests
  if (request.method !== 'GET') {
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

    // Build query based on filters and role
    let query = supabaseAdmin
      .from('tasks')
      .select(`
        *,
        assigned_agent:users!tasks_assigned_agent_id_fkey(id, name, email),
        assigned_by_manager:users!tasks_assigned_by_manager_id_fkey(id, name, email),
        branch:branches(id, name)
      `);

    // Apply role-based filtering
    if (userRole === 'agent') {
      // Agents can only see their assigned tasks
      query = query.eq('assigned_agent_id', user.id);
    } else if (userRole === 'branch_manager' || userRole === 'manager') {
      // Managers see tasks from their branch
      if (userBranchId) {
        query = query.eq('branch_id', userBranchId);
      }
    }
    // Admins see all tasks (no filter)

    // Apply additional filters from query params
    const { status, branch_id, assigned_agent_id, search, limit = 50, offset = 0 } = request.query as TaskFilters;
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (branch_id && (userRole === 'admin')) {
      query = query.eq('branch_id', branch_id);
    }
    
    if (assigned_agent_id && (userRole === 'admin' || userRole === 'manager' || userRole === 'branch_manager')) {
      query = query.eq('assigned_agent_id', assigned_agent_id);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Execute query with pagination
    const { data: tasks, error: tasksError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tasksError) {
      console.error('Tasks fetch error:', tasksError);
      response.status(500).json({ error: 'Failed to fetch tasks' });
      return;
    }

    // Map status to frontend format
    const mappedTasks = (tasks || []).map((task: any) => ({
      ...task,
      status: mapTaskStatus(task.status),
    }));

    response.status(200).json({
      tasks: mappedTasks,
      pagination: {
        limit,
        offset,
        total: tasks?.length || 0,
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

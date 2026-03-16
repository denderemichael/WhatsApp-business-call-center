import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { supabaseAdmin } from '../../lib/supabaseClient.js';

interface AssignTaskRequestBody {
  taskId: string;
  agentId: string;
  status?: string;
  description?: string;
  deadline?: string;
}

/**
 * Assign Task Handler
 * POST /api/tasks/assignTask
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

    // Only managers and admins can assign tasks
    if (!['admin', 'manager', 'branch_manager'].includes(userRole)) {
      response.status(403).json({ error: 'Only managers and admins can assign tasks' });
      return;
    }

    const { taskId, agentId, status, description, deadline } = request.body as AssignTaskRequestBody;

    // Validate required fields
    if (!taskId) {
      response.status(400).json({ error: 'Task ID is required' });
      return;
    }

    if (!agentId) {
      response.status(400).json({ error: 'Agent ID is required' });
      return;
    }

    // Verify the task exists
    const { data: taskData, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('*, branch_id')
      .eq('id', taskId)
      .single();

    if (taskError || !taskData) {
      response.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if manager can access this task (same branch for branch managers)
    if (userRole === 'branch_manager' && taskData.branch_id !== userBranchId) {
      response.status(403).json({ error: 'Cannot assign tasks from other branches' });
      return;
    }

    // Verify the agent exists and has agent role
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from('users')
      .select('id, role, branch_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agentData) {
      response.status(404).json({ error: 'Agent not found' });
      return;
    }

    if (agentData.role !== 'agent') {
      response.status(400).json({ error: 'Can only assign tasks to agents' });
      return;
    }

    // Verify agent is in the same branch (for branch managers)
    if (userRole === 'branch_manager' && agentData.branch_id !== userBranchId) {
      response.status(403).json({ error: 'Cannot assign tasks to agents from other branches' });
      return;
    }

    // Build update object
    const updateData: any = {
      assigned_agent_id: agentId,
      assigned_by_manager_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (status) {
      // Map frontend status to backend status
      const statusMap: Record<string, string> = {
        'submitted': 'pending',
        'in_progress': 'in_progress',
        'approved': 'completed',
        'rejected': 'cancelled',
      };
      updateData.status = statusMap[status] || status;
    }

    if (description) {
      updateData.description = description;
    }

    if (deadline) {
      updateData.deadline = deadline;
    }

    // If no status provided, set to in_progress if being assigned
    if (!status && !taskData.status) {
      updateData.status = 'in_progress';
    }

    // Update the task
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Task update error:', updateError);
      response.status(500).json({ error: 'Failed to assign task' });
      return;
    }

    response.status(200).json({
      message: 'Task assigned successfully',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Assign task error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

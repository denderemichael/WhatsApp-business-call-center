import type { VercelRequest, VercelResponse } from '../types/vercel';
import { supabaseAdmin } from '../../lib/supabaseClient';

interface AgentFilters {
  branch_id?: string;
  role?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Agents Handler
 * GET /api/agents/getAgents
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

    // Build query - only get agents
    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, role, branch_id, avatar, status')
      .eq('role', 'agent');

    // Apply role-based filtering for branch managers
    if (userRole === 'branch_manager' && userBranchId) {
      query = query.eq('branch_id', userBranchId);
    }

    // Apply additional filters from query params
    const { branch_id, limit = 50, offset = 0 } = request.query as AgentFilters;
    
    if (branch_id && userRole === 'admin') {
      query = query.eq('branch_id', branch_id);
    }

    // Execute query with pagination
    const { data: agents, error: agentsError } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (agentsError) {
      console.error('Agents fetch error:', agentsError);
      response.status(500).json({ error: 'Failed to fetch agents' });
      return;
    }

    response.status(200).json({
      agents: agents || [],
    });
  } catch (error) {
    console.error('Get agents error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

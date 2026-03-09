import type { VercelRequest, VercelResponse } from '../types/vercel';
import { supabaseAdmin } from '../../lib/supabaseClient';

interface BranchFilters {
  limit?: number;
  offset?: number;
}

/**
 * Get Branches Handler
 * GET /api/branches/getBranches
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

    const token = authHeader.replace('Bearer ', '');
    
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

    // Build query
    let query = supabaseAdmin
      .from('branches')
      .select('*');

    // Apply role-based filtering for branch managers
    if (userRole === 'branch_manager' && userBranchId) {
      query = query.eq('id', userBranchId);
    }

    // Apply pagination
    const { limit = 50, offset = 0 } = request.query as BranchFilters;

    // Execute query with pagination
    const { data: branches, error: branchesError } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (branchesError) {
      console.error('Branches fetch error:', branchesError);
      response.status(500).json({ error: 'Failed to fetch branches' });
      return;
    }

    response.status(200).json({
      branches: branches || [],
    });
  } catch (error) {
    console.error('Get branches error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

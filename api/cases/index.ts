import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { supabaseAdmin } from '../../lib/supabaseClient.js';

/**
 * Unified Cases Handler
 * Handles:
 * - GET /api/cases - list cases
 * - POST /api/cases - create case
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

    // GET /cases - list cases
    if (request.method === 'GET') {
      // Build query based on filters and role
      let query = supabaseAdmin
        .from('cases')
        .select(`
          *,
          branch:branches(id, name),
          assigned_agent:users!cases_assigned_agent_id_fkey(id, name, email)
        `);

      // Apply role-based filtering
      if (userRole === 'agent') {
        // Agents can only see their assigned cases
        query = query.eq('assigned_agent_id', user.id);
      } else if (userRole === 'branch_manager' || userRole === 'manager') {
        // Managers see cases from their branch
        if (userBranchId) {
          query = query.eq('branch_id', userBranchId);
        }
      }
      // Admins see all cases (no filter)

      // Get query params
      const { status, branch_id, search, limit = 50, offset = 0 } = request.query as any;
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (branch_id && (userRole === 'admin')) {
        query = query.eq('branch_id', branch_id);
      }

      if (search) {
        query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }

      // Execute query with pagination
      const { data: cases, error: casesError } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (casesError) {
        console.error('Cases fetch error:', casesError);
        response.status(500).json({ error: 'Failed to fetch cases' });
        return;
      }

      response.status(200).json({
        cases: cases || [],
        total: cases?.length || 0,
      });
      return;
    }

    // POST /cases - create case
    if (request.method === 'POST') {
      const body = request.body as any;
      const { customer_phone, customer_name, branch_id, priority, first_message } = body;

      // Validate required fields
      if (!customer_phone) {
        response.status(400).json({ error: 'Customer phone is required' });
        return;
      }

      // Use the user's branch if no branch_id provided
      const caseBranchId = branch_id || userBranchId;

      // Create the case
      const { data: caseData, error: caseError } = await supabaseAdmin
        .from('cases')
        .insert({
          customer_phone,
          customer_name,
          branch_id: caseBranchId,
          priority: priority || 'normal',
          status: 'new',
          first_message,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (caseError) {
        console.error('Case creation error:', caseError);
        response.status(500).json({ error: 'Failed to create case' });
        return;
      }

      response.status(201).json({
        message: 'Case created successfully',
        case: caseData,
      });
      return;
    }

    // Method not allowed
    response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Cases error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

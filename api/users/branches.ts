import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { supabaseAdmin } from '../../lib/supabaseClient.js';

/**
 * Get Branches Handler
 * GET /api/users/branches
 * 
 * Fetches all branches from Supabase
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
    // Get authorization header
    const authHeader = request.headers.authorization;
    
    // Validate header format - must be 'Bearer <token>'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Authorization required' });
      return;
    }

    // Extract token from 'Bearer <token>'
    const token = authHeader.split(' ')[1];
    
    // Verify the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      response.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch all branches
    const { data: branches, error: branchesError } = await supabaseAdmin
      .from('branches')
      .select('*')
      .order('name', { ascending: true });

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

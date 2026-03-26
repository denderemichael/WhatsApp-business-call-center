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
    // Get authorization header (optional - for logged in users)
    const authHeader = request.headers.authorization;
    console.log('branches.ts: Processing request, authHeader:', authHeader ? 'present' : 'none');
    
    // If auth header provided, verify the user (but don't require it for signup flow)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log('branches.ts: Token present, verifying...');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !user) {
        // Invalid token - but we can still proceed without auth for public branch list
        console.log('branches.ts: Invalid token, proceeding without auth');
      } else {
        console.log('branches.ts: User verified:', user.id);
      }
    } else {
      console.log('branches.ts: No auth header, proceeding without auth');
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

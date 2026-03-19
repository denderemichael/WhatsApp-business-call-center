import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { supabaseAdmin } from '../../lib/supabaseClient.js';

interface LoginRequestBody {
  email: string;
  password: string;
}

/**
 * User Login Handler
 * POST /api/auth/login
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
    const { email, password } = request.body as LoginRequestBody;

    // Validate required fields
    if (!email || !password) {
      response.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Sanitize email - trim and lowercase
    const emailClean = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      response.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Authenticate user with Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: emailClean,
      password,
    });

    if (authError) {
      console.error('Auth login error:', authError);
      
      // Handle specific auth errors
      if (authError.message.includes('Invalid login credentials')) {
        response.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      
      response.status(401).json({ error: authError.message });
      return;
    }

    if (!authData.user || !authData.session) {
      response.status(401).json({ error: 'Authentication failed' });
      return;
    }

    // Get user profile from users table using admin client
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      response.status(500).json({ error: 'Failed to fetch user profile' });
      return;
    }

    if (!profileData) {
      response.status(404).json({ error: 'User profile not found' });
      return;
    }

    // Return real Supabase token
    response.status(200).json({
      message: 'Login successful',
      token: authData.session.access_token,
      user: {
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        role: profileData.role,
        branchId: profileData.branch_id,
        avatar: profileData.avatar,
        status: profileData.status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { supabaseAdmin } from '../../lib/supabaseClient.js';

interface SignupRequestBody {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'manager' | 'branch_manager' | 'agent';
  branch_id?: string;
}

/**
 * User Registration Handler
 * POST /api/auth/signup
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
    const { email, password, name, role = 'agent', branch_id } = request.body as SignupRequestBody;

    // Validate required fields
    if (!email || !password || !name) {
      response.status(400).json({ error: 'Email, password, and name are required' });
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

    // Validate password length
    if (password.length < 6) {
      response.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Create user in Supabase Auth using admin API (avoids rate limits)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailClean,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        branch_id: branch_id || null,
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      
      // Handle specific auth errors
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        response.status(400).json({ error: 'User with this email already exists' });
        return;
      }
      
      response.status(400).json({ error: authError.message });
      return;
    }

    if (!authData.user) {
      response.status(500).json({ error: 'Failed to create user' });
      return;
    }

    // Create user profile in the users table
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: emailClean,
        name,
        role,
        branch_id: branch_id || null,
        status: 'online',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail the request if profile creation fails - user still created in auth
      console.warn('Profile creation failed, but user was created in auth');
    }

    response.status(201).json({
      message: 'User registered successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role,
        branch_id: branch_id || null,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

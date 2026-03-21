import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { supabaseAdmin } from '../../lib/supabaseClient.js';

interface SignupRequestBody {
  email: string;
  password: string;
  name: string;
  role?: string;
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

    // Log incoming role for debugging
    console.log("Incoming role:", `"${role}"`);

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

    // Normalize role
    const allowedRoles = ['admin', 'manager', 'branch_manager', 'agent'];
    let cleanedRole = role?.toLowerCase().trim();

    // Convert "branch manager" to "branch_manager"
    if (cleanedRole === 'branch manager') {
      cleanedRole = 'branch_manager';
    }

    if (!allowedRoles.includes(cleanedRole || '')) {
      response.status(400).json({ error: 'Invalid role value' });
      return;
    }

    // Create user in Supabase Auth using admin API (avoids rate limits)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailClean,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: cleanedRole,
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
        role: cleanedRole,
        branch_id: branch_id || null,
        status: 'online',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Rollback: delete created auth user if profile creation fails
      console.log('Rolling back auth user due to profile creation failure');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(console.error);
      
      response.status(500).json({ error: 'Failed to create user profile' });
      return;
    }

    // Sign in immediately to get a session token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: emailClean,
      password,
    });

    if (sessionError || !sessionData.session) {
      console.error('Session creation error:', sessionError);
      // User was created but we couldn't create session - still return success but without token
      // Frontend will need to ask user to login
      response.status(201).json({
        message: 'User registered successfully. Please login.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name,
          role: cleanedRole,
          branch_id: branch_id || null,
        },
      });
      return;
    }

    response.status(201).json({
      message: 'User registered successfully',
      token: sessionData.session.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role: cleanedRole,
        branchId: branch_id || null,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

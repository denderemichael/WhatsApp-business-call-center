import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { supabaseAdmin } from '../lib/supabase';
import { inMemoryStore } from '../lib/inMemoryStore';

const router = Router();

// Demo users for development (when database isn't set up)
const DEMO_USERS = [
  { id: 'demo-admin-1', name: 'Admin User', email: 'admin@example.com', role: 'admin', branch_id: null, status: 'online' },
  { id: 'demo-manager-1', name: 'Branch Manager', email: 'manager@example.com', role: 'manager', branch_id: 'demo-branch-1', status: 'online' },
  { id: 'demo-agent-1', name: 'Agent John', email: 'john@example.com', role: 'agent', branch_id: 'demo-branch-1', status: 'online' },
];

// POST /auth/signup - Create new account
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, branchId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    // Validate role - accept both 'manager' and 'branch_manager'
    const validRoles = ['admin', 'manager', 'branch_manager', 'agent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or agent' });
    }

    // Normalize role to 'manager' if 'branch_manager' is passed
    const normalizedRole = role === 'branch_manager' ? 'manager' : role;

    // Try to save to database if available
    let newUser = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([{
          name,
          email,
          role: normalizedRole,
          branch_id: branchId || null,
          status: 'online',
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Database insert error:', error);
      } else if (data) {
        newUser = data;
        console.log('User saved to database with ID:', newUser.id);
      }
    } catch (dbError) {
      console.error('Database not available:', dbError);
    }

    // Fall back to in-memory user if database insert failed
    if (!newUser) {
      console.log('Using in-memory user');
      newUser = inMemoryStore.createUser({
        name,
        email,
        role: normalizedRole,
        branch_id: branchId || null,
        status: 'online',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: newUser,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login - Login with email and password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user = null;

    // Try to find user in database first
    try {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);

      if (users && users.length > 0) {
        user = users[0];
      }
    } catch (dbError) {
      console.log('Database not available, using demo users');
    }

    // Fall back to demo users if not found in database
    if (!user) {
      user = DEMO_USERS.find(u => u.email === email);
    }

    // Also check in-memory store for signed-up users
    if (!user) {
      user = inMemoryStore.getUserByEmail(email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // For demo purposes, accept "demo123" or any password
    const isValidPassword = password === 'demo123' || password.length > 0;

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    // Return user info and token (exclude password if exists)
    const { password_hash, ...userWithoutPassword } = user as any;

    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/verify - Verify token is valid
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; role: string };

      // Try to fetch user from database first
      let user = null;
      try {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', decoded.userId)
          .limit(1);

        if (users && users.length > 0) {
          user = users[0];
        }
      } catch (dbError) {
        console.log('Database not available for verify');
      }

      // Fall back to demo users if not found
      if (!user) {
        user = DEMO_USERS.find(u => u.id === decoded.userId);
      }

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const { password_hash, ...userWithoutPassword } = user as any;
      res.json({ user: userWithoutPassword });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

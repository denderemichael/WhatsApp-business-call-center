import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticate, requireRole } from '../middleware/auth';
import { supabaseAdmin, type User } from '../lib/supabase';
import { inMemoryStore } from '../lib/inMemoryStore';

const router = Router();

// GET /users - Get all users (managers and admins only)
router.get('/', authenticate, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, branch_id } = req.query;

    let data = null;
    let error = null;

    try {
      let query = supabaseAdmin
        .from('users')
        .select(`
          *,
          branch:branches(id, name)
        `);

      if (role) {
        query = query.eq('role', role as string);
      }

      if (req.user?.role === 'manager') {
        // Managers can only see users in their branch
        query = query.eq('branch_id', req.user.branch_id || '');
      } else if (branch_id) {
        query = query.eq('branch_id', branch_id as string);
      }

      const result = await query.order('name', { ascending: true });
      data = result.data;
      error = result.error;
    } catch (dbError) {
      // Database not available
      console.log('Database not available, using in-memory store');
    }

    // Fall back to in-memory store
    if (!data) {
      let users = inMemoryStore.getAllUsers();
      
      // Filter by role
      if (role) {
        users = users.filter(u => u.role === role);
      }
      
      // Filter by branch for managers
      if (req.user?.role === 'manager' && req.user?.branch_id) {
        users = users.filter(u => u.branch_id === req.user?.branch_id);
      } else if (branch_id) {
        users = users.filter(u => u.branch_id === branch_id);
      }
      
      return res.json({ users });
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ users: data });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/agents - Get all agents (for assignment dropdown)
router.get('/agents', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  let data = null;
  let error = null;
  const { branch_id } = req.query;

  try {
    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, branch_id')
      .eq('role', 'agent');

    // Filter by branch if provided
    if (branch_id) {
      query = query.eq('branch_id', branch_id as string);
    } else if (req.user?.role === 'manager') {
      // Managers can only see agents in their branch (only if no branch_id filter)
      query = query.eq('branch_id', req.user.branch_id || '');
    }

    const result = await query.order('name', { ascending: true });
    data = result.data;
    error = result.error;
  } catch (dbError) {
    console.log('Database not available, using in-memory store');
  }

  // Fall back to in-memory store
  if (!data) {
    let agents = inMemoryStore.getAllUsers().filter(u => u.role === 'agent');
    
    // Filter by branch if provided
    if (branch_id) {
      agents = agents.filter(a => a.branch_id === branch_id);
    } else if (req.user?.role === 'manager' && req.user?.branch_id) {
      agents = agents.filter(a => a.branch_id === req.user?.branch_id);
    }
    
    return res.json({ agents });
  }

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ agents: data });
});

// GET /users/branches - Get all branches
router.get('/branches', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  let data = null;
  let error = null;

  try {
    const result = await supabaseAdmin
      .from('branches')
      .select('*')
      .order('name', { ascending: true });
    
    data = result.data;
    error = result.error;
  } catch (dbError) {
    console.log('Database not available, using in-memory store');
  }

  // Fall back to in-memory store
  if (!data) {
    const branches = inMemoryStore.getAllBranches();
    return res.json({ branches });
  }

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ branches: data });
});

// GET /users/me - Get current user
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: branch } = req.user.branch_id
      ? await supabaseAdmin
          .from('branches')
          .select('*')
          .eq('id', req.user.branch_id)
          .single()
      : { data: null };

    return res.json({
      user: {
        ...req.user,
        branch,
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users - Create new user (admins only)
router.post('/', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, role, branch_id } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'name, email, and role are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        role,
        branch_id: branch_id || null,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ user: data });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/:id - Update user
router.patch('/:id', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, branch_id } = req.body;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        name,
        email,
        role,
        branch_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ user: data });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users/branches - Create new branch (managers and admins)
router.post('/branches', authenticate, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    let data = null;
    let error = null;

    try {
      const result = await supabaseAdmin
        .from('branches')
        .insert({ name, location })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } catch (dbError) {
      console.log('Database not available, using in-memory store');
    }

    // Fall back to in-memory store
    if (!data) {
      const branch = inMemoryStore.createBranch({ name, location, status: 'active' });
      return res.status(201).json({ branch });
    }

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ branch: data });
  } catch (error) {
    console.error('Error creating branch:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

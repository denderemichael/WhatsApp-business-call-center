import { Router, Response } from 'express';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { tasksService } from '../services/tasks';
import { inMemoryStore } from '../lib/inMemoryStore';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/tasks
 * Get tasks for the current user based on their role
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const branchId = req.query.branch_id as string | undefined;

    let result;
    let useFallback = false;

    try {
      if (userRole === 'agent') {
        // Agents see tasks assigned to them
        result = await tasksService.getTasksForAgent(userId);
      } else if (userRole === 'manager' || userRole === 'admin') {
        // Managers see tasks created by them
        result = await tasksService.getTasksForManager(userId, branchId);
      } else {
        return res.status(403).json({ error: 'Invalid role' });
      }
      
      if (!result.success) {
        useFallback = true;
      }
    } catch (dbError) {
      console.log('Database not available, using in-memory store for tasks');
      useFallback = true;
    }

    // Fall back to in-memory store
    if (useFallback) {
      let tasks = inMemoryStore.getAllTasks();
      
      if (userRole === 'agent') {
        // Agents see tasks assigned to them
        tasks = tasks.filter(t => t.assignee_id === userId);
      } else if (userRole === 'manager' || userRole === 'admin') {
        // Managers see all tasks in their branch
        if (branchId) {
          tasks = tasks.filter(t => t.branch_id === branchId);
        } else if (req.user!.branch_id) {
          tasks = tasks.filter(t => t.branch_id === req.user!.branch_id);
        }
      }
      
      return res.json({ tasks });
    }

    res.json({ tasks: result?.tasks || [] });
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tasks/:id
 * Get a specific task by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await tasksService.getTaskById(taskId);

    if (!result || !result.success) {
      return res.status(404).json({ error: result?.error || 'Task not found' });
    }

    // Check if user has access to this task
    const task = result.task!;
    if (userRole === 'agent' && task.assigned_to_agent_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'manager' && task.assigned_by_manager_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error in GET /api/tasks/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks
 * Create a new task (Manager only - Admin cannot create tasks)
 */
router.post('/', requireRole('manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const managerId = req.user!.id;
    const { title, description, priority, assigned_to_agent_id, branch_id, case_id, deadline } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let result;
    let useFallback = false;

    try {
      result = await tasksService.createTask(
        {
          title,
          description,
          priority,
          assigned_to_agent_id,
          branch_id,
          case_id,
          deadline,
        },
        managerId
      );
      
      if (!result.success) {
        useFallback = true;
      }
    } catch (dbError) {
      console.log('Database not available, using in-memory store for tasks');
      useFallback = true;
    }

    // Fall back to in-memory store
    if (useFallback) {
      const task = inMemoryStore.createTask({
        title,
        description,
        priority: priority || 'normal',
        status: 'pending',
        assigned_to_agent_id,
        assigned_by_manager_id: managerId,
        branch_id: branch_id || req.user!.branch_id || null,
        case_id,
        deadline,
      });
      
      return res.status(201).json({ task });
    }

    if (!result?.success) {
      return res.status(500).json({ error: result?.error });
    }

    res.status(201).json({ task: result?.task });
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/tasks/:id
 * Update a task (status, description, priority)
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { status, description, priority, deadline } = req.body;

    // First get the task to check permissions
    const taskResult = await tasksService.getTaskById(taskId);
    
    if (!taskResult.success || !taskResult.task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.task;

    // Check permissions
    let canUpdate = false;
    if (userRole === 'admin') {
      canUpdate = true;
    } else if (userRole === 'manager' && task.assigned_by_manager_id === userId) {
      canUpdate = true;
    } else if (userRole === 'agent' && task.assigned_to_agent_id === userId) {
      // Agents can only update status
      if (Object.keys(req.body).some(k => k !== 'status')) {
        return res.status(403).json({ error: 'Agents can only update task status' });
      }
      canUpdate = true;
    }

    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await tasksService.updateTask(taskId, {
      status,
      description,
      priority,
      deadline,
    });

    if (!result || !result.success) {
      return res.status(500).json({ error: result?.error || 'Failed to update task' });
    }

    res.json({ task: result.task });
  } catch (error) {
    console.error('Error in PATCH /api/tasks/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tasks/agents
 * Get list of agents (for manager to assign tasks)
 */
router.get('/meta/agents', requireRole('manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supabaseAdmin } = require('../lib/supabase');
    const branchId = req.query.branch_id as string | undefined;

    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, role, branch_id, created_at')
      .eq('role', 'agent');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('Error fetching agents:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ agents: data || [] });
  } catch (error) {
    console.error('Error in GET /api/tasks/meta/agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

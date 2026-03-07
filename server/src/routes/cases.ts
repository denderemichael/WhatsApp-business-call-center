import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticate, requireRole } from '../middleware/auth';
import { casesService } from '../services/cases';
import { auditHelpers, auditService } from '../services/audit';
import { supabaseAdmin } from '../lib/supabase';
import { inMemoryStore } from '../lib/inMemoryStore';

const router = Router();

// GET /cases - Get all cases (with filters)
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      status,
      branch_id,
      assigned_agent_id,
      search,
      limit,
      offset,
    } = req.query;

    // Branch managers can only see cases from their branch
    let effectiveBranchId = branch_id as string | undefined;
    if (req.user?.role === 'manager' && !effectiveBranchId) {
      effectiveBranchId = req.user.branch_id || undefined;
    }

    let result: { success: boolean; error?: string; cases?: unknown[]; total?: number } | undefined;
    let useFallback = false;

    try {
      result = await casesService.getCases({
        status: status as 'open' | 'pending' | 'resolved' | 'closed' | undefined,
        branch_id: effectiveBranchId,
        assigned_agent_id: assigned_agent_id as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      
      if (!result.success) {
        useFallback = true;
      }
    } catch (dbError) {
      console.log('Database not available, using in-memory store for cases');
      useFallback = true;
    }

    // Fall back to in-memory store
    if (useFallback) {
      let tasks = inMemoryStore.getAllTasks();
      
      // Filter by status
      if (status) {
        tasks = tasks.filter(t => t.status === status);
      }
      
      // Filter by branch
      if (effectiveBranchId) {
        tasks = tasks.filter(t => t.branch_id === effectiveBranchId);
      }
      
      // Filter by assignee
      if (assigned_agent_id) {
        tasks = tasks.filter(t => t.assignee_id === assigned_agent_id);
      }
      
      return res.json({
        cases: tasks,
        total: tasks.length,
        limit: limit ? parseInt(limit as string, 10) : 20,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });
    }

    if (!result || !result.success) {
      return res.status(500).json({ error: result?.error || 'Failed to fetch cases' });
    }

    return res.json({
      cases: result.cases,
      total: result.total,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /cases/:id - Get single case with messages
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await casesService.getCaseById(id);

    if (!result || !result.success) {
      return res.status(404).json({ error: result?.error || 'Case not found' });
    }

    return res.json({ case: result.case });
  } catch (error) {
    console.error('Error fetching case:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /cases - Create a new case (manual)
router.post('/', authenticate, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customer_phone, customer_name, branch_id } = req.body;

    if (!customer_phone) {
      return res.status(400).json({ error: 'customer_phone is required' });
    }

    const result = await casesService.createCase({
      customer_phone,
      customer_name,
      branch_id: branch_id || req.user?.branch_id,
    });

    if (!result || !result.success) {
      return res.status(500).json({ error: result?.error || 'Failed to create case' });
    }

    // Log the action
    if (result.case) {
      await auditHelpers.logCaseCreated(result.case.id, req.user?.id || 'unknown', {
        customer_phone,
        customer_name,
      });
    }

    return res.status(201).json({ case: result.case });
  } catch (error) {
    console.error('Error creating case:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /cases/:id - Update case (status, assignment)
router.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assigned_agent_id, branch_id } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get current case
    const currentCase = await casesService.getCaseById(id);
    if (!currentCase.success || !currentCase.case) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Prepare updates
    const updates: Record<string, unknown> = {};
    
    if (status && status !== currentCase.case.status) {
      updates.status = status;
      await auditHelpers.logCaseStatusChanged(id, userId, currentCase.case.status, status);
    }

    if (assigned_agent_id !== undefined) {
      updates.assigned_agent_id = assigned_agent_id;
      if (assigned_agent_id) {
        await auditHelpers.logCaseAssigned(id, userId, assigned_agent_id, {
          previous_agent: currentCase.case.assigned_agent_id,
        });
      }
    }

    if (branch_id !== undefined) {
      updates.branch_id = branch_id;
    }

    const result = await casesService.updateCase(id, updates);

    if (!result || !result.success) {
      return res.status(500).json({ error: result?.error || 'Failed to update case' });
    }

    return res.json({ case: result.case });
  } catch (error) {
    console.error('Error updating case:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /cases/:id/assign - Assign agent to case
router.post('/:id/assign', authenticate, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { agent_id } = req.body;
    const userId = req.user?.id;

    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await casesService.assignAgent(id, agent_id, userId);

    if (!result || !result.success) {
      return res.status(400).json({ error: result?.error || 'Failed to assign agent' });
    }

    return res.json({ case: result.case });
  } catch (error) {
    console.error('Error assigning agent:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /cases/:id/logs - Get audit logs for a case
router.get('/:id/logs', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    const result = await auditService.getCaseLogs(id);

    if (!result || !result.success) {
      return res.status(500).json({ error: result?.error || 'Failed to fetch case logs' });
    }

    return res.json({ logs: result.logs });
  } catch (error) {
    console.error('Error fetching case logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Response } from 'express';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { reportsService } from '../services/reports';
import { inMemoryStore } from '../lib/inMemoryStore';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/reports
 * Get reports for the current user based on their role
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let result;
    let useFallback = false;

    try {
      if (userRole === 'admin') {
        // Admins see all reports
        result = await reportsService.getReportsForAdmin();
      } else if (userRole === 'manager' || userRole === 'branch_manager') {
        // Branch managers see reports from their branch
        const branchId = req.user!.branch_id;
        if (branchId) {
          result = await reportsService.getReportsForBranch(branchId);
        } else {
          // Fallback: if no branch, see reports they submitted
          result = await reportsService.getReportsForManager(userId);
        }
      } else {
        return res.status(403).json({ error: 'Invalid role' });
      }

      if (!result.success) {
        useFallback = true;
      }
    } catch (dbError) {
      console.log('Database not available, using in-memory store for reports');
      useFallback = true;
    }

    // Fall back to in-memory store
    if (useFallback) {
      let reports = inMemoryStore.getAllReports();
      
      if (userRole === 'manager') {
        // Managers see reports they created
        reports = reports.filter(r => r.created_by === userId);
      }
      // Admins see all reports
      
      return res.json({ reports });
    }

    if (!result?.success) {
      return res.status(500).json({ error: result?.error || 'Failed to fetch reports' });
    }

    return res.json({ reports: result?.reports || [] });
  } catch (error) {
    console.error('Error in GET /api/reports:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/:id
 * Get a specific report by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await reportsService.getReportById(reportId);

    if (!result || !result.success || !result.report) {
      return res.status(404).json({ error: result?.error || 'Report not found' });
    }

    const report = result.report;

    // Check if user has access to this report
    if (userRole === 'manager' && report.reported_by_manager_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'agent' && report.reported_by_agent_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Admins can see all reports

    res.json({ report });
  } catch (error) {
    console.error('Error in GET /api/reports/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reports
 * Create a new report (Manager only)
 */
router.post('/', requireRole('manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, description, urgency, case_id, branch_id } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let result;
    let useFallback = false;

    try {
      result = await reportsService.createReport(
        {
          title,
          description,
          urgency,
          case_id,
          branch_id,
        },
        userId
      );
      
      if (!result.success) {
        useFallback = true;
      }
    } catch (dbError) {
      console.log('Database not available, using in-memory store for reports');
      useFallback = true;
    }

    // Fall back to in-memory store
    if (useFallback) {
      const report = inMemoryStore.createReport({
        title,
        description,
        urgency: urgency || 'normal',
        status: 'pending',
        case_id,
        branch_id: branch_id || req.user!.branch_id || null,
        reported_by: userId,
      });
      
      return res.status(201).json({ report });
    }

    if (!result?.success) {
      return res.status(500).json({ error: result?.error || 'Failed to create report' });
    }

    return res.status(201).json({ report: result.report });
  } catch (error) {
    console.error('Error in POST /api/reports:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/reports/:id
 * Update a report (Admin can update status and response, Manager can update draft)
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { status, admin_response } = req.body;

    // First get the report to check permissions
    const reportResult = await reportsService.getReportById(reportId);
    
    if (!reportResult.success || !reportResult.report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportResult.report;

    // Check permissions
    let canUpdate = false;
    if (userRole === 'admin') {
      canUpdate = true;
    } else if (userRole === 'manager' && report.reported_by_manager_id === userId) {
      // Managers can only update draft reports
      if (report.status !== 'draft') {
        return res.status(403).json({ error: 'Can only update draft reports' });
      }
      canUpdate = true;
    }

    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await reportsService.updateReport(reportId, {
      status,
      admin_response,
    });

    if (!result || !result.success) {
      return res.status(500).json({ error: result?.error || 'Failed to update report' });
    }

    return res.json({ report: result.report });
  } catch (error) {
    console.error('Error in PATCH /api/reports/:id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

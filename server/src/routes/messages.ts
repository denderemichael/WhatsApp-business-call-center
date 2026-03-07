import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticate, requireRole } from '../middleware/auth';
import { messagesService } from '../services/messages';
import { casesService } from '../services/cases';
import { whapiService } from '../services/whapiService';
import { auditHelpers } from '../services/audit';

const router = Router();

// GET /messages/case/:caseId - Get messages for a case
router.get('/case/:caseId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    const { limit, offset } = req.query;

    // Check if user has access to this case
    if (req.user?.role === 'agent') {
      const caseResult = await casesService.getCaseById(caseId);
      if (caseResult.success && caseResult.case) {
        // Agents can only see their assigned cases
        if (caseResult.case.assigned_agent_id !== req.user.id) {
          return res.status(403).json({ error: 'Not authorized to view this case' });
        }
      }
    }

    const result = await messagesService.getMessages(caseId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    if (!result || !result.success) {
      return res.status(500).json({ error: result?.error || 'Failed to fetch messages' });
    }

    return res.json({ messages: result.messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /messages/send - Send a WhatsApp message
router.post('/send', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { case_id, message_text, message_type = 'text' } = req.body;
    const userId = req.user?.id;

    if (!case_id || !message_text) {
      return res.status(400).json({ error: 'case_id and message_text are required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get the case
    const caseResult = await casesService.getCaseById(case_id);
    if (!caseResult.success || !caseResult.case) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const caseData = caseResult.case;

    // Check authorization
    if (req.user?.role === 'agent') {
      // Agents can only reply to their assigned cases
      if (caseData.assigned_agent_id !== userId) {
        return res.status(403).json({ 
          error: 'Only the assigned agent can reply to this case',
          assigned_agent_id: caseData.assigned_agent_id,
        });
      }
    }

    // Send message via WhatsApp
    const sendResult = await whapiService.sendTextMessage(
      caseData.customer_phone,
      message_text
    );

    if (!sendResult.success) {
      return res.status(500).json({ error: sendResult.error || 'Failed to send WhatsApp message' });
    }

    // Store the message in database
    const storeResult = await messagesService.createMessage({
      case_id,
      sender_type: 'agent',
      sender_id: userId,
      message_text,
      message_type,
      metadata: { whatsapp_message_id: sendResult.messageId },
    });

    if (!storeResult.success) {
      console.error('Failed to store message:', storeResult.error);
      // Message was sent but not stored - still return success
    }

    // Log the action (only if we have a messageId)
    if (sendResult.messageId) {
      await auditHelpers.logMessageSent(case_id, userId, sendResult.messageId);
    }

    return res.status(201).json({
      success: true,
      message: storeResult.message,
      whatsapp_message_id: sendResult.messageId,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /messages/recent - Get recent messages across all cases
router.get('/recent', authenticate, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit } = req.query;

    const result = await messagesService.getRecentMessages(
      limit ? parseInt(limit as string, 10) : 50
    );

    if (!result || !result.success) {
      return res.status(500).json({ error: result?.error || 'Failed to fetch recent messages' });
    }

    return res.json({ messages: result.messages });
  } catch (error) {
    console.error('Error fetching recent messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

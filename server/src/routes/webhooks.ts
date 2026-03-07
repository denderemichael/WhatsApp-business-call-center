import { Router, Request, Response } from 'express';
import { whapiService } from '../services/whapiService';
import { casesService } from '../services/cases';
import { messagesService } from '../services/messages';
import { auditHelpers } from '../services/audit';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

/**
 * Whapi.Cloud WhatsApp Webhook Handler
 * 
 * Whapi.Cloud sends POST requests to this endpoint when:
 * 1. Customer sends a message
 * 2. Message status changes (delivered, read, etc.)
 */

// GET /webhooks/whatsapp - Webhook verification and status
router.get('/whatsapp', async (req: Request, res: Response) => {
  try {
    const accountInfo = await whapiService.getAccountInfo();
    res.status(200).json({
      status: 'configured',
      provider: 'whapi.cloud',
      message: 'WhatsApp webhook endpoint is active',
      account: accountInfo,
    });
  } catch (error) {
    res.status(200).json({
      status: 'configured',
      provider: 'whapi.cloud',
      message: 'WhatsApp webhook endpoint is active (account info unavailable)',
    });
  }
});

// POST /webhooks/whatsapp - Receive incoming WhatsApp messages
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    // Parse Whapi.Cloud webhook data
    const parseResult = whapiService.parseIncomingMessage(req.body);

    if (!parseResult.valid || !parseResult.message) {
      console.log('Invalid message received:', req.body);
      return res.status(400).json({ error: 'Invalid message' });
    }

    const { message } = parseResult;

    console.log(`Incoming WhatsApp message from ${message.from}: ${message.text}`);

    // 1. Check for existing open conversation
    const { data: existingCase } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('customer_phone', message.from)
      .in('status', ['open', 'pending', 'assigned'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let caseId: string;
    let isNewConversation = false;

    if (existingCase) {
      // Existing conversation - add message to it
      caseId = existingCase.id;
    } else {
      // New conversation - create case and send welcome message
      const caseResult = await casesService.createCase({
        customer_phone: message.from,
      });

      if (!caseResult.success || !caseResult.case) {
        console.error('Failed to create case:', caseResult.error);
        return res.status(500).json({ error: 'Failed to create case' });
      }

      caseId = caseResult.case.id;
      isNewConversation = true;

      console.log(`New conversation created: ${caseId}`);
    }

    // 2. Store the incoming customer message
    const messageResult = await messagesService.createMessage({
      case_id: caseId,
      sender_type: 'customer',
      message_text: message.text || '',
      message_type: 'text',
    });

    if (!messageResult.success) {
      console.error('Failed to store message:', messageResult.error);
    }

    // 3. If this is a new conversation, send welcome menu
    if (isNewConversation) {
      console.log('Sending welcome message to:', message.from);
      
      const welcomeResult = await whapiService.sendWelcomeMessage(message.from);

      if (welcomeResult.success) {
        // Store the welcome message as a system message
        await messagesService.createMessage({
          case_id: caseId,
          sender_type: 'system',
          message_text: 'welcome_menu',
          message_type: 'system',
          metadata: {
            template: 'welcome_menu',
            sent_message_id: welcomeResult.messageId,
          },
        });
      } else {
        console.error('Failed to send welcome message:', welcomeResult.error);
      }
    }

    // 4. Log the received message
    await auditHelpers.logMessageReceived(caseId, {
      message_id: message.id,
      from: message.from,
      is_new_conversation: isNewConversation,
    });

    // 5. Update case timestamp
    await casesService.updateCase(caseId, {});

    // Return 200 OK to acknowledge receipt
    return res.status(200).json({ 
      success: true, 
      caseId,
      isNewConversation,
    });
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /webhooks/whatsapp/status - Message status callbacks
router.post('/whatsapp/status', async (req: Request, res: Response) => {
  try {
    // Whapi.Cloud status callback format
    const { messages, status } = req.body;
    
    console.log('Message status update received:', req.body);

    // Log status updates if needed
    // Could update message status in database

    return res.status(200).send();
  } catch (error) {
    console.error('Error processing status webhook:', error);
    return res.status(500).send();
  }
});

// POST /webhooks/test - Test endpoint for local development
router.post('/test', (req: Request, res: Response) => {
  console.log('Test webhook received:', req.body);
  return res.status(200).json({ success: true, message: 'Test successful' });
});

export default router;

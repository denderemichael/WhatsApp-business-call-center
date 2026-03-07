import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

/**
 * Tumira WhatsApp Service
 * 
 * Handles sending and receiving WhatsApp messages via Tumira API.
 * 
 * Setup:
 * 1. Create account at Tumira portal
 * 2. Get your API key from the portal
 * 3. Get your Session ID from the Sessions page
 * 4. Set webhook URL to your server
 * 
 * Phone number format: International format with country code (e.g., 263771234567)
 */

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IncomingMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: string;
  type: string;
}

export class WhapiService {
  private readonly client: AxiosInstance;
  private readonly sessionId: string;

  constructor() {
    this.client = axios.create({
      baseURL: config.tumira.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.tumira.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    this.sessionId = config.tumira.sessionId;
  }

  /**
   * Send a WhatsApp text message to a customer
   */
  async sendTextMessage(to: string, message: string): Promise<SendMessageResult> {
    try {
      if (!config.tumira.apiKey || !this.sessionId) {
        console.warn('Tumira API not configured - message logged only');
        return { success: true, messageId: 'mock-' + Date.now() };
      }

      // Format phone number - ensure it has country code
      const formattedNumber = this.formatPhoneNumber(to);

      const response = await this.client.post('/send/text', {
        sessionId: this.sessionId,
        phone: formattedNumber,
        message: message,
      });

      const messageId = response.data?.id || response.data?.messageId || Date.now().toString();
      console.log(`WhatsApp message sent to ${formattedNumber}: ${messageId}`);
      
      return { success: true, messageId };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error sending WhatsApp message:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a template message (for automated responses)
   */
  async sendTemplateMessage(
    to: string,
    templateMessage: string
  ): Promise<SendMessageResult> {
    return this.sendTextMessage(to, templateMessage);
  }

  /**
   * Parse incoming webhook from Tumira
   * Tumira sends JSON payload
   */
  parseIncomingMessage(body: Record<string, unknown>): {
    valid: boolean;
    message?: IncomingMessage;
    error?: string;
  } {
    try {
      // Tumira webhook structure
      // Check for messages array
      const messages = body.messages as Array<Record<string, unknown>> | undefined;
      const messageObj = messages?.[0];
      
      if (!messageObj) {
        // Try direct message format
        const msgData = body as Record<string, unknown>;
        if (!msgData.from) {
          return { valid: false, error: 'No message found in webhook payload' };
        }
        return this.parseMessageData(msgData);
      }

      return this.parseMessageData(messageObj);
    } catch (error) {
      console.error('Error parsing Tumira message:', error);
      return { valid: false, error: 'Invalid message format' };
    }
  }

  /**
   * Parse individual message data from Tumira webhook
   */
  private parseMessageData(msgData: Record<string, unknown>): {
    valid: boolean;
    message?: IncomingMessage;
    error?: string;
  } {
    try {
      // Extract sender info
      const from = (msgData.from as string) || (msgData.sender as string) || (msgData.phone as string) || '';
      const messageId = (msgData.id as string) || (msgData.messageId as string) || Date.now().toString();
      
      // Extract message content
      let text = '';
      if (msgData.text) {
        text = typeof msgData.text === 'string' ? msgData.text : (msgData.text as Record<string, unknown>).body as string || '';
      } else if (msgData.message) {
        text = typeof msgData.message === 'string' ? msgData.message : (msgData.message as Record<string, unknown>).body as string || '';
      } else if (msgData.caption) {
        text = msgData.caption as string;
      }

      // Message type
      const type = (msgData.type as string) || (msgData.messageType as string) || 'text';
      
      // Timestamp
      const timestamp = (msgData.timestamp as string) || (msgData.time as string) || new Date().toISOString();

      if (!from) {
        return { valid: false, error: 'Missing sender information' };
      }

      // Format phone number - remove any non-digit characters
      const fromNumber = from.replace(/\D/g, '');

      return {
        valid: true,
        message: {
          id: messageId,
          from: fromNumber,
          to: this.sessionId, // Use session ID as the "to" address
          text,
          timestamp,
          type,
        },
      };
    } catch (error) {
      console.error('Error parsing message data:', error);
      return { valid: false, error: 'Invalid message data format' };
    }
  }

  /**
   * Verify webhook authenticity (simple token check)
   */
  verifyWebhook(token: string): boolean {
    // Simple verification - check if token is present
    // In production, you might want more robust verification
    return !!token && token.length > 0;
  }

  /**
   * Format phone number to international format
   * Tumira expects: 263771234567 (Zambia) or country code + number
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any prefix like whatsapp:, +, etc.
    let digits = phone.replace(/whatsapp:/g, '').replace(/\+/g, '');
    
    // If number doesn't start with country code, assume Zambia (263)
    if (!digits.startsWith('263') && digits.length <= 10) {
      digits = '263' + digits;
    }
    
    return digits;
  }

  /**
   * Send welcome message (Mukuru-style menu)
   */
  async sendWelcomeMessage(to: string): Promise<SendMessageResult> {
    console.log(`Sending welcome message to ${to}`);
    return this.sendTextMessage(to, config.welcomeMessage);
  }

  /**
   * Send agent assignment notification
   */
  async sendAgentAssignedMessage(
    to: string,
    agentName: string,
    branchName: string
  ): Promise<SendMessageResult> {
    const message = `You are now chatting with ${agentName} from ${branchName}. How can we help you today?`;
    return this.sendTextMessage(to, message);
  }

  /**
   * Send case resolved notification
   */
  async sendCaseResolvedMessage(to: string): Promise<SendMessageResult> {
    const message = `Thank you for contacting us! Your conversation has been resolved. If you need further assistance, please start a new conversation.`;
    return this.sendTextMessage(to, message);
  }

  /**
   * Get account status/info
   */
  async getAccountInfo(): Promise<{ connected: boolean; phoneNumber?: string; error?: string }> {
    try {
      if (!config.tumira.apiKey) {
        return { connected: false, error: 'API key not configured' };
      }

      const response = await this.client.get('/sessions');
      const sessions = Array.isArray(response.data) ? response.data : response.data?.sessions || [];
      
      if (sessions.length > 0) {
        return {
          connected: true,
          phoneNumber: sessions[0]?.phone || sessions[0]?.number || this.sessionId,
        };
      }
      
      return { connected: false, error: 'No active sessions found' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { connected: false, error: errorMessage };
    }
  }
}

export const whapiService = new WhapiService();

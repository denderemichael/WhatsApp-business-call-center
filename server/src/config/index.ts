import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  },
  
  // Tumira WhatsApp Configuration
  tumira: {
    apiKey: process.env.TUMIRA_API_KEY || '',
    sessionId: process.env.TUMIRA_SESSION_ID || '',
    baseUrl: process.env.TUMIRA_BASE_URL || 'http://aja.co.zw:21465/api',
  },
  
  // Whapi.Cloud WhatsApp Configuration (deprecated - use Tumira)
  whapi: {
    token: process.env.WHAPI_TOKEN || '',
    baseUrl: process.env.WHAPI_BASE_URL || 'https://api.whapi.cloud/v1',
    phoneNumber: process.env.WHAPI_PHONE_NUMBER || '',
  },
  
  welcomeMessage: process.env.WELCOME_MESSAGE || `Welcome to X Support 🎋

Please select an option:
1. New Order
2. Check Existing Order
3. Account Help
4. Talk to an Agent

Reply with the number (1-4)`,
};

export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.supabase.url) {
    errors.push('SUPABASE_URL is required');
  }
  if (!config.supabase.serviceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
  }
  
  // Check WhatsApp configuration (either Tumira or Whapi)
  const hasTumira = config.tumira.apiKey && config.tumira.sessionId;
  const hasWhapi = config.whapi.token && config.whapi.phoneNumber;
  
  if (!hasTumira && !hasWhapi) {
    errors.push('TUMIRA_API_KEY and TUMIRA_SESSION_ID (or WHAPI_TOKEN and WHAPI_PHONE_NUMBER) are required');
  }
  
  if (config.nodeEnv === 'production') {
    if (!config.jwt.secret || config.jwt.secret === 'default-secret-change-in-production') {
      errors.push('JWT_SECRET must be set in production');
    }
  }
  
  return { valid: errors.length === 0, errors };
};

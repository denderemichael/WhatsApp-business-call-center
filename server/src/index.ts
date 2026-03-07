import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config, validateConfig } from './config';
import webhooksRouter from './routes/webhooks';
import casesRouter from './routes/cases';
import messagesRouter from './routes/messages';
import reportsRouter from './routes/reports';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import tasksRouter from './routes/tasks';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/auth', authRouter);
app.use('/webhooks', webhooksRouter);
app.use('/cases', casesRouter);
app.use('/messages', messagesRouter);
app.use('/reports', reportsRouter);
app.use('/users', usersRouter);
app.use('/tasks', tasksRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Agent Contact Centre API',
    version: '1.0.0',
    endpoints: {
      webhooks: '/webhooks/whatsapp',
      cases: '/cases',
      messages: '/messages',
      reports: '/reports',
      users: '/users',
      health: '/health',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = () => {
  // Validate configuration
  const { valid, errors } = validateConfig();
  
  if (!valid) {
    console.error('Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   WhatsApp Agent Contact Centre API Server                 ║
║                                                            ║
║   Status: Running                                          ║
║   Port: ${config.port}                                             ║
║   Environment: ${config.nodeEnv.padEnd(18)}                           ║
║                                                            ║
║   Endpoints:                                               ║
║   - GET  /health            Health check                   ║
║   - GET  /                  API info                        ║
║   - GET  /webhooks/whatsapp WhatsApp webhook (POST)        ║
║   - GET  /cases             List cases                     ║
║   - POST /cases             Create case                     ║
║   - GET  /messages/send     Send message                   ║
║   - GET  /reports/dashboard Dashboard stats                 ║
║   - GET  /users/me          Current user                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
};

startServer();

export default app;

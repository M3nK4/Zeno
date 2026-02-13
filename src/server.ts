import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env, validateConfig } from './config.js';
import { getDb, closeDb } from './database/setup.js';
import { webhookHandler } from './webhook/handler.js';
import { adminRoutes } from './admin/routes.js';
import { logger } from './logger.js';

// Validate security-critical config before starting
validateConfig();

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: env.corsOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limit: 100 requests per minute
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppe richieste, riprova più tardi' },
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
getDb();
logger.info('Database initialized');

// Webhook endpoint with dedicated rate limit: 60 req/min per IP
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Webhook rate limit exceeded' },
});
app.post('/webhook', webhookLimiter, webhookHandler);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login rate limit: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di login, riprova tra 15 minuti' },
});
app.post('/admin/api/login', loginLimiter);

// Admin panel static files
app.use('/admin', express.static(path.join(__dirname, 'admin/public')));

// Admin API routes
app.use('/admin/api', adminRoutes);

// Start server
const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, 'WhatsApp Agent server running');
  logger.info({ url: `http://localhost:${env.port}/admin` }, 'Admin panel');
  logger.info({ url: `http://localhost:${env.port}/webhook` }, 'Webhook URL');
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received, closing server...');
  server.close(() => {
    closeDb();
    logger.info('Server closed');
    process.exit(0);
  });
  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

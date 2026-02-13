import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env, validateConfig } from './config.js';
import { getDb, closeDb } from './database/setup.js';
import { webhookHandler } from './webhook/handler.js';
import { adminRoutes } from './admin/routes.js';
import { pageAuthMiddleware, logoutHandler } from './admin/auth.js';
import { logger } from './logger.js';

// Validate security-critical config before starting
validateConfig();

const app = express();

// Security headers — allow inline scripts/handlers for admin panel
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));

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

// Parse JSON bodies and cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize database
getDb();
logger.info('Database initialized');

// Webhook endpoint with dedicated rate limit and API key auth
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Webhook rate limit exceeded' },
});
app.post('/webhook', webhookLimiter, (req, res, next) => {
  // Verify Evolution API key if configured
  if (env.evolutionApiKey) {
    const apiKey = req.headers['apikey'] as string | undefined;
    if (apiKey !== env.evolutionApiKey) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
  }
  next();
}, webhookHandler);

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

// Admin panel: public assets (CSS, JS) — no auth needed
const noCacheHeaders = (_res: express.Response) => {
  _res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  _res.setHeader('Pragma', 'no-cache');
};
app.use('/admin/assets', express.static(path.join(__dirname, 'admin/public/assets'), {
  etag: false, lastModified: false, setHeaders: noCacheHeaders,
}));

// Admin login page — public
app.get('/admin/', (_req, res) => {
  noCacheHeaders(res);
  res.sendFile(path.join(__dirname, 'admin/public/index.html'));
});
app.get('/admin/index.html', (_req, res) => {
  res.redirect('/admin/');
});

// Admin protected pages — require valid session cookie
const protectedPages = ['dashboard.html', 'settings.html', 'conversations.html'];
for (const page of protectedPages) {
  app.get(`/admin/${page}`, pageAuthMiddleware, (_req, res) => {
    noCacheHeaders(res);
    res.sendFile(path.join(__dirname, `admin/public/${page}`));
  });
}

// Admin logout (clears cookie)
app.post('/admin/api/logout', logoutHandler);

// Admin API routes
app.use('/admin/api', adminRoutes);

// Start server
const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, 'Zeno server running');
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

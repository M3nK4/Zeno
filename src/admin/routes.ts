import { Router } from 'express';
import { loginHandler, authMiddleware } from './auth.js';
import { getAllConfig, setConfig } from '../database/settings.js';
import { getConversation, getStats, listConversationsPaginated, searchMessagesPaginated } from '../database/conversations.js';
import { getInstanceStatus } from '../evolution/client.js';
import { getDb } from '../database/setup.js';

export const adminRoutes = Router();

function parsePagination(query: Record<string, unknown>): { page: number; limit: number } {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10) || 20));
  return { page, limit };
}

// Public: login
adminRoutes.post('/login', loginHandler);

// All routes below require auth
adminRoutes.use(authMiddleware);

// Dashboard stats
adminRoutes.get('/stats', async (_req, res) => {
  try {
    const stats = getStats();
    const evolution = await getInstanceStatus();
    res.json({ ...stats, evolutionConnected: evolution.connected });
  } catch {
    res.status(500).json({ error: 'Errore nel recupero statistiche' });
  }
});

// Settings
adminRoutes.get('/settings', (_req, res) => {
  try {
    const config = getAllConfig();
    // Mask sensitive keys
    const masked = { ...config };
    if (masked['gemini_api_key']) {
      masked['gemini_api_key'] = masked['gemini_api_key'].slice(0, 8) + '••••••••';
    }
    res.json(masked);
  } catch {
    res.status(500).json({ error: 'Errore nel recupero impostazioni' });
  }
});

adminRoutes.post('/settings', (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    const allowedKeys = [
      'llm_model', 'gemini_api_key', 'system_prompt', 'max_history',
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedKeys.includes(key) && typeof value === 'string') {
        // Don't overwrite with masked values
        if (value.includes('••••••••')) continue;
        setConfig(key, value);
      }
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore nel salvataggio impostazioni' });
  }
});

// Conversations (paginated)
adminRoutes.get('/conversations', (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const result = listConversationsPaginated(page, limit);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Errore nel recupero conversazioni' });
  }
});

adminRoutes.get('/conversations/:phone', (req, res) => {
  try {
    const messages = getConversation(req.params.phone);
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Errore nel recupero conversazione' });
  }
});

// Search (paginated)
adminRoutes.get('/search', (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: 'Parametro q richiesto' });
      return;
    }
    const { page, limit } = parsePagination(req.query);
    const results = searchMessagesPaginated(query, page, limit);
    res.json(results);
  } catch {
    res.status(500).json({ error: 'Errore nella ricerca' });
  }
});

// Health check (detailed, authenticated)
adminRoutes.get('/health', async (_req, res) => {
  try {
    let dbStatus = 'ok';
    try {
      getDb().prepare('SELECT 1').get();
    } catch {
      dbStatus = 'error';
    }

    let evolutionStatus: { connected: boolean; name: string } = { connected: false, name: '' };
    try {
      evolutionStatus = await getInstanceStatus();
    } catch {
      // Evolution API unreachable
    }

    res.json({
      status: dbStatus === 'ok' && evolutionStatus.connected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: dbStatus },
        evolution: {
          status: evolutionStatus.connected ? 'connected' : 'disconnected',
          instance: evolutionStatus.name,
        },
      },
    });
  } catch {
    res.status(500).json({ error: 'Errore nel health check' });
  }
});

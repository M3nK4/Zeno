import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

// We create a fresh in-memory database per test and mock getDb to return it
let testDb: Database.Database;

vi.mock('../src/database/setup.js', () => ({
  getDb: () => testDb,
}));

// Import after mock setup
import { saveMessage, getHistory, getStats, searchMessages, listConversations, getConversation } from '../src/database/conversations.js';

function initTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      media_type TEXT,
      media_url TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
  `);
  return db;
}

describe('Database - conversations', () => {
  beforeEach(() => {
    testDb = initTestDb();
  });

  describe('saveMessage', () => {
    it('saves a text message to the database', () => {
      saveMessage('393331234567', 'user', 'Ciao, come stai?');

      const rows = testDb.prepare('SELECT * FROM messages').all() as any[];
      expect(rows).toHaveLength(1);
      expect(rows[0].phone).toBe('393331234567');
      expect(rows[0].role).toBe('user');
      expect(rows[0].content).toBe('Ciao, come stai?');
      expect(rows[0].media_type).toBeNull();
      expect(rows[0].media_url).toBeNull();
    });

    it('saves a message with media type and url', () => {
      saveMessage('393331234567', 'user', 'Foto allegata', 'image', 'https://example.com/photo.jpg');

      const rows = testDb.prepare('SELECT * FROM messages').all() as any[];
      expect(rows).toHaveLength(1);
      expect(rows[0].media_type).toBe('image');
      expect(rows[0].media_url).toBe('https://example.com/photo.jpg');
    });

    it('saves an assistant message', () => {
      saveMessage('393331234567', 'assistant', 'Ciao! Tutto bene, grazie.');

      const rows = testDb.prepare('SELECT * FROM messages').all() as any[];
      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe('assistant');
    });

    it('stores null for empty mediaType and mediaUrl', () => {
      saveMessage('393331234567', 'user', 'Test', '', '');

      const rows = testDb.prepare('SELECT * FROM messages').all() as any[];
      expect(rows[0].media_type).toBeNull();
      expect(rows[0].media_url).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('returns messages for a specific phone in chronological order', () => {
      saveMessage('393331234567', 'user', 'Messaggio 1');
      saveMessage('393331234567', 'assistant', 'Risposta 1');
      saveMessage('393331234567', 'user', 'Messaggio 2');

      const history = getHistory('393331234567');
      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('Messaggio 1');
      expect(history[1].content).toBe('Risposta 1');
      expect(history[2].content).toBe('Messaggio 2');
    });

    it('does not return messages from other phone numbers', () => {
      saveMessage('393331234567', 'user', 'Da utente 1');
      saveMessage('393339999999', 'user', 'Da utente 2');

      const history = getHistory('393331234567');
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Da utente 1');
    });

    it('respects the limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        saveMessage('393331234567', 'user', `Messaggio ${i}`);
      }

      const history = getHistory('393331234567', 3);
      expect(history).toHaveLength(3);
      // Should return the last 3 messages (DESC LIMIT then reversed)
      expect(history[0].content).toBe('Messaggio 7');
      expect(history[2].content).toBe('Messaggio 9');
    });

    it('returns empty array for unknown phone', () => {
      const history = getHistory('000000000');
      expect(history).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns zero stats for empty database', () => {
      const stats = getStats();
      expect(stats.totalMessages).toBe(0);
      expect(stats.totalConversations).toBe(0);
      expect(stats.messagesToday).toBe(0);
      expect(stats.activeToday).toBe(0);
    });

    it('counts total messages and conversations correctly', () => {
      saveMessage('393331111111', 'user', 'Ciao');
      saveMessage('393331111111', 'assistant', 'Ciao!');
      saveMessage('393332222222', 'user', 'Salve');

      const stats = getStats();
      expect(stats.totalMessages).toBe(3);
      expect(stats.totalConversations).toBe(2);
    });

    it('counts today messages correctly', () => {
      // Messages inserted with CURRENT_TIMESTAMP are "today"
      saveMessage('393331111111', 'user', 'Messaggio di oggi');

      const stats = getStats();
      expect(stats.messagesToday).toBe(1);
      expect(stats.activeToday).toBe(1);
    });
  });

  describe('searchMessages', () => {
    it('finds messages matching the query', () => {
      saveMessage('393331234567', 'user', 'Vorrei informazioni sui prezzi');
      saveMessage('393331234567', 'assistant', 'I prezzi partono da 100 euro');
      saveMessage('393331234567', 'user', 'Grazie mille');

      const results = searchMessages('prezzi');
      expect(results).toHaveLength(2);
    });

    it('returns empty array when no match', () => {
      saveMessage('393331234567', 'user', 'Ciao');

      const results = searchMessages('blockchain');
      expect(results).toEqual([]);
    });

    it('performs case-insensitive search via LIKE', () => {
      saveMessage('393331234567', 'user', 'Voglio parlare con SUPPORTO');

      const results = searchMessages('supporto');
      // SQLite LIKE is case-insensitive for ASCII by default
      expect(results).toHaveLength(1);
    });
  });

  describe('listConversations', () => {
    it('returns conversation summaries grouped by phone', () => {
      saveMessage('393331111111', 'user', 'Ciao');
      saveMessage('393331111111', 'assistant', 'Ciao!');
      saveMessage('393332222222', 'user', 'Salve');

      const conversations = listConversations();
      expect(conversations).toHaveLength(2);
      expect(conversations[0].messageCount).toBeGreaterThanOrEqual(1);
      expect(conversations[1].messageCount).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for empty database', () => {
      const conversations = listConversations();
      expect(conversations).toEqual([]);
    });
  });

  describe('getConversation', () => {
    it('returns all messages for a phone in ascending order', () => {
      saveMessage('393331234567', 'user', 'Prima');
      saveMessage('393331234567', 'assistant', 'Seconda');
      saveMessage('393331234567', 'user', 'Terza');

      const conversation = getConversation('393331234567');
      expect(conversation).toHaveLength(3);
      expect(conversation[0].content).toBe('Prima');
      expect(conversation[2].content).toBe('Terza');
    });
  });
});

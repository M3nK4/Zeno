import { getDb } from './setup.js';
import type { DbMessage, ConversationSummary, DbStats, CountRow, PaginatedResult } from '../types.js';

// Re-export for backward compatibility
export type Message = DbMessage;

export function saveMessage(
  phone: string,
  role: 'user' | 'assistant',
  content: string,
  mediaType?: string,
  mediaUrl?: string
): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO messages (phone, role, content, media_type, media_url) VALUES (?, ?, ?, ?, ?)'
  ).run(phone, role, content, mediaType || null, mediaUrl || null);
}

export function getHistory(phone: string, limit: number = 50): DbMessage[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM messages WHERE phone = ? ORDER BY id DESC LIMIT ?'
  ).all(phone, limit) as DbMessage[];
  return rows.reverse();
}

export function listConversations(): ConversationSummary[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      phone,
      (SELECT content FROM messages m2 WHERE m2.phone = m1.phone ORDER BY m2.id DESC LIMIT 1) as lastMessage,
      MAX(timestamp) as lastTimestamp,
      COUNT(*) as messageCount
    FROM messages m1
    GROUP BY phone
    ORDER BY lastTimestamp DESC
  `).all() as ConversationSummary[];
}

export function listConversationsPaginated(page: number, limit: number): PaginatedResult<ConversationSummary> {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(DISTINCT phone) as c FROM messages').get() as CountRow).c;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  const data = db.prepare(`
    SELECT
      phone,
      (SELECT content FROM messages m2 WHERE m2.phone = m1.phone ORDER BY m2.id DESC LIMIT 1) as lastMessage,
      MAX(timestamp) as lastTimestamp,
      COUNT(*) as messageCount
    FROM messages m1
    GROUP BY phone
    ORDER BY lastTimestamp DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as ConversationSummary[];

  return { data, pagination: { page, limit, total, totalPages } };
}

export function getConversation(phone: string): DbMessage[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM messages WHERE phone = ? ORDER BY id ASC'
  ).all(phone) as DbMessage[];
}

export function searchMessages(query: string): DbMessage[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM messages WHERE content LIKE ? ORDER BY timestamp DESC LIMIT 100'
  ).all(`%${query}%`) as DbMessage[];
}

export function searchMessagesPaginated(query: string, page: number, limit: number): PaginatedResult<DbMessage> {
  const db = getDb();
  const total = (db.prepare(
    'SELECT COUNT(*) as c FROM messages WHERE content LIKE ?'
  ).get(`%${query}%`) as CountRow).c;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  const data = db.prepare(
    'SELECT * FROM messages WHERE content LIKE ? ORDER BY timestamp DESC LIMIT ? OFFSET ?'
  ).all(`%${query}%`, limit, offset) as DbMessage[];

  return { data, pagination: { page, limit, total, totalPages } };
}

export function getStats(): DbStats {
  const db = getDb();
  const totalMessages = (db.prepare('SELECT COUNT(*) as c FROM messages').get() as CountRow).c;
  const totalConversations = (db.prepare('SELECT COUNT(DISTINCT phone) as c FROM messages').get() as CountRow).c;
  const messagesToday = (db.prepare("SELECT COUNT(*) as c FROM messages WHERE date(timestamp) = date('now')").get() as CountRow).c;
  const activeToday = (db.prepare("SELECT COUNT(DISTINCT phone) as c FROM messages WHERE date(timestamp) = date('now')").get() as CountRow).c;
  return { totalMessages, totalConversations, messagesToday, activeToday };
}

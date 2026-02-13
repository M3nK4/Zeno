import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/agent.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}

function initTables(database: Database.Database): void {
  database.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_messages_phone_timestamp ON messages(phone, timestamp);

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

  // Insert default config values if not present
  const defaults: Record<string, string> = {
    llm_provider: 'claude',
    llm_model: 'claude-sonnet-4-5-20250514',
    system_prompt: 'Sei l\'assistente AI di zerox.technology, un laboratorio di innovazione tecnologica specializzato in AI, sistemi distribuiti, blockchain e cybersecurity. Rispondi in modo professionale, conciso e utile. Se non sai qualcosa, dillo onestamente. Se l\'utente chiede di parlare con un umano, usa la frase esatta: "Ti metto in contatto con il team".',
    handoff_email: '',
    handoff_keywords: 'parla con umano,parlare con una persona,operatore,assistenza umana,human',
    max_history: '50',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
  };

  const insert = database.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }
}

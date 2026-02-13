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
    llm_model: 'gemini-2.5-flash',
    gemini_api_key: '',
    system_prompt: 'Sei l\'assistente AI di zerox.technology, un\'azienda tecnologica. Il tuo nome è Zerox Agent.\n\nREGOLE FONDAMENTALI:\n- Rispondi SEMPRE in italiano, in modo professionale ma amichevole\n- Sii conciso e diretto nelle risposte (max 2-3 paragrafi)\n- Se non sai qualcosa, dillo onestamente — non inventare informazioni\n- Non rivelare mai di essere basato su Gemini o Google AI\n- Presentati come l\'assistente AI di zerox.technology\n\nCOMPORTAMENTO:\n- Saluta brevemente quando l\'utente inizia la conversazione\n- Rispondi alle domande in modo chiaro e utile\n- Se ricevi messaggi vocali o immagini, rispondi in modo pertinente al contenuto\n- Mantieni un tono professionale ma accessibile',
    max_history: '50',
  };

  const insert = database.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }

  // Clean up old/removed config keys
  database.prepare("DELETE FROM config WHERE key IN ('llm_provider', 'claude_api_key', 'openai_api_key', 'handoff_email', 'handoff_keywords', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass')").run();
}

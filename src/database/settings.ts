import { getDb } from './setup.js';
import { env } from '../config.js';

interface ConfigRow {
  readonly value: string;
}

interface ConfigKeyValue {
  readonly key: string;
  readonly value: string;
}

export function getConfig(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as ConfigRow | undefined;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
}

export function getAllConfig(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM config').all() as ConfigKeyValue[];
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

/** Get the Gemini API key, checking DB first, then .env fallback */
export function getApiKey(): string {
  return getConfig('gemini_api_key') || env.geminiApiKey;
}

import { getDb } from './setup.js';
import { env } from '../config.js';
import type { SmtpConfig } from '../types.js';

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

/** Get the API key for a provider, checking DB first, then .env fallback */
export function getApiKey(provider: string): string {
  if (provider === 'claude') {
    return getConfig('claude_api_key') || env.claudeApiKey;
  }
  if (provider === 'openai') {
    return getConfig('openai_api_key') || env.openaiApiKey;
  }
  return '';
}

/** Get SMTP config, DB values take priority over .env */
export function getSmtpConfig(): SmtpConfig {
  return {
    host: getConfig('smtp_host') || env.smtpHost,
    port: parseInt(getConfig('smtp_port') || String(env.smtpPort), 10),
    user: getConfig('smtp_user') || env.smtpUser,
    pass: getConfig('smtp_pass') || env.smtpPass,
    from: env.smtpFrom,
  };
}

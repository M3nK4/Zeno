import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'change-me',

  evolutionApiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
  evolutionApiKey: process.env.EVOLUTION_API_KEY || '',
  evolutionInstance: process.env.EVOLUTION_INSTANCE || 'zerox',

  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'noreply@zerox.technology',

  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'change-me',

  corsOrigin: process.env.CORS_ORIGIN || '*',
};

const INSECURE_SECRETS = new Set(['change-me', 'secret', 'password', 'default', '']);

export function validateConfig(): void {
  const errors: string[] = [];

  if (INSECURE_SECRETS.has(env.jwtSecret)) {
    errors.push('JWT_SECRET is not set or uses an insecure default. Set a strong, unique secret in .env');
  }

  if (env.jwtSecret.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long');
  }

  if (!env.evolutionApiKey) {
    // Use process.stderr directly — logger may not be initialized yet
    process.stderr.write('[WARN] EVOLUTION_API_KEY is not set — webhook requests will not be authenticated\n');
  }

  if (errors.length > 0) {
    process.stderr.write('\n=== SECURITY CONFIGURATION ERRORS ===\n');
    errors.forEach(e => process.stderr.write(`  - ${e}\n`));
    process.stderr.write('=====================================\n\n');
    process.exit(1);
  }
}

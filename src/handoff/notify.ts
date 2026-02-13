import nodemailer from 'nodemailer';
import { getConfig, getSmtpConfig } from '../database/settings.js';
import { getHistory } from '../database/conversations.js';
import { logger } from '../logger.js';

/**
 * Check if the user message triggers a handoff.
 * Returns true if handoff was triggered and email sent.
 */
export async function checkHandoff(phone: string, userText: string): Promise<boolean> {
  const keywordsRaw = getConfig('handoff_keywords') || '';
  if (!keywordsRaw.trim()) return false;

  const keywords = keywordsRaw.split(',').map(k => k.trim().toLowerCase());
  const textLower = userText.toLowerCase();

  const triggered = keywords.some(kw => kw && textLower.includes(kw));
  if (!triggered) return false;

  const email = getConfig('handoff_email');
  if (!email) {
    logger.warn('Handoff triggered but no email configured');
    return true;
  }

  try {
    await sendHandoffEmail(phone, email);
    logger.info({ phone, email }, 'Handoff email sent');
  } catch (err) {
    logger.error({ err, phone, email }, 'Failed to send handoff email');
  }

  return true;
}

async function sendHandoffEmail(phone: string, recipientEmail: string): Promise<void> {
  const smtp = getSmtpConfig();
  if (!smtp.host || !smtp.user) {
    logger.warn('SMTP not configured, skipping handoff email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const history = getHistory(phone, 10);
  const conversationSummary = history
    .map(m => `[${m.role === 'user' ? 'Utente' : 'Bot'}] ${m.content}`)
    .join('\n');

  await transporter.sendMail({
    from: smtp.from,
    to: recipientEmail,
    subject: `[zerox.technology] Richiesta assistenza umana — ${phone}`,
    text: `Un utente ha richiesto di parlare con un operatore umano.

Numero: +${phone}
Data: ${new Date().toLocaleString('it-IT')}

--- Ultimi messaggi ---
${conversationSummary || '(nessun messaggio precedente)'}

---
Rispondi direttamente su WhatsApp al numero sopra indicato.
`,
  });
}

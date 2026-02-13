import { Request, Response } from 'express';
import { saveMessage, getHistory } from '../database/conversations.js';
import { getConfig, getApiKey } from '../database/settings.js';
import { sendText, downloadMedia } from '../evolution/client.js';
import { routeLlm } from '../llm/router.js';
import { transcribeAudio } from '../media/voice.js';
import { describeImage } from '../media/image.js';
import { logger } from '../logger.js';

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  // Validate webhook body structure before processing
  const body = req.body;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  if (typeof body.event !== 'string') {
    res.status(400).json({ error: 'Missing or invalid event field' });
    return;
  }

  // Respond immediately so Evolution API doesn't retry
  res.status(200).json({ status: 'received' });

  try {
    const event = body.event;

    // Only process incoming messages
    if (event !== 'messages.upsert') return;

    const data = body.data;
    if (!data || typeof data !== 'object') return;

    const key = data.key;
    if (!key || typeof key !== 'object') return;

    // Skip messages sent by us
    if (key.fromMe) return;

    const remoteJid = key.remoteJid;
    if (typeof remoteJid !== 'string') return;

    const phone = remoteJid.replace('@s.whatsapp.net', '');
    if (!phone || !/^\d{7,15}$/.test(phone)) return;

    const message = data.message;
    if (!message) return;

    let userText = '';
    let mediaType: string | undefined;
    let mediaUrl: string | undefined;

    // Determine message type and extract content
    if (message.conversation) {
      userText = message.conversation;
    } else if (message.extendedTextMessage?.text) {
      userText = message.extendedTextMessage.text;
    } else if (message.audioMessage) {
      mediaType = 'voice';
      try {
        const audioBuffer = await downloadMedia(key.id);
        userText = await transcribeAudio(audioBuffer);
      } catch (err) {
        logger.error({ err, phone }, 'Voice transcription failed');
        await sendText(phone, 'Non sono riuscito a trascrivere il messaggio vocale. Puoi riprovare o scrivermi in testo?');
        return;
      }
    } else if (message.imageMessage) {
      mediaType = 'image';
      const caption = message.imageMessage.caption || '';
      try {
        const imageBuffer = await downloadMedia(key.id);
        const description = await describeImage(imageBuffer, message.imageMessage.mimetype || 'image/jpeg');
        userText = caption
          ? `[L'utente ha inviato un'immagine: ${description}] Messaggio: ${caption}`
          : `[L'utente ha inviato un'immagine: ${description}]`;
      } catch (err) {
        logger.error({ err, phone }, 'Image description failed');
        userText = caption || "[L'utente ha inviato un'immagine che non sono riuscito ad analizzare]";
      }
    } else {
      // Unsupported message type (stickers, documents, etc.)
      return;
    }

    if (!userText.trim()) return;

    // Limit text length to prevent abuse and excessive API costs
    const MAX_TEXT_LENGTH = 10000;
    if (userText.length > MAX_TEXT_LENGTH) {
      userText = userText.substring(0, MAX_TEXT_LENGTH);
    }

    // Get conversation history
    const maxHistory = parseInt(getConfig('max_history') || '50', 10);
    const history = getHistory(phone, maxHistory);

    // Get LLM config
    const model = getConfig('llm_model') || 'gemini-2.5-flash';
    const systemPrompt = getConfig('system_prompt') || '';
    const apiKey = getApiKey();

    if (!apiKey) {
      logger.error('No Gemini API key configured');
      await sendText(phone, 'Il servizio non è al momento configurato. Riprova più tardi.');
      return;
    }

    // Build messages for LLM
    const llmMessages = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    llmMessages.push({ role: 'user', content: userText });

    // Call Gemini
    const response = await routeLlm({
      model,
      apiKey,
      systemPrompt,
      messages: llmMessages,
    });

    // Save messages
    saveMessage(phone, 'user', userText, mediaType, mediaUrl);
    saveMessage(phone, 'assistant', response);

    // Send reply via WhatsApp
    await sendText(phone, response);
  } catch (err) {
    logger.error({ err }, 'Webhook handler error');
  }
}

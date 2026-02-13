import { Request, Response } from 'express';
import { saveMessage, getHistory } from '../database/conversations.js';
import { getConfig, getApiKey } from '../database/settings.js';
import { sendText, downloadMedia } from '../evolution/client.js';
import { routeLlm } from '../llm/router.js';
import { transcribeAudio } from '../media/voice.js';
import { describeImage } from '../media/image.js';
import { checkHandoff } from '../handoff/notify.js';
import type { LlmProvider } from '../types.js';

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
        console.error('Voice transcription failed:', err);
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
        console.error('Image description failed:', err);
        userText = caption || "[L'utente ha inviato un'immagine che non sono riuscito ad analizzare]";
      }
    } else {
      // Unsupported message type (stickers, documents, etc.)
      return;
    }

    if (!userText.trim()) return;

    // Check for handoff keywords
    const handoffTriggered = await checkHandoff(phone, userText);
    if (handoffTriggered) {
      saveMessage(phone, 'user', userText, mediaType, mediaUrl);
      const handoffReply = 'Ti metto in contatto con il team, verrai ricontattato al più presto.';
      saveMessage(phone, 'assistant', handoffReply);
      await sendText(phone, handoffReply);
      return;
    }

    // Get conversation history
    const maxHistory = parseInt(getConfig('max_history') || '50', 10);
    const history = getHistory(phone, maxHistory);

    // Get LLM config
    const provider = (getConfig('llm_provider') || 'claude') as LlmProvider;
    const model = getConfig('llm_model') || 'claude-sonnet-4-5-20250514';
    const systemPrompt = getConfig('system_prompt') || '';
    const apiKey = getApiKey(provider);

    if (!apiKey) {
      console.error(`No API key configured for provider: ${provider}`);
      await sendText(phone, 'Il servizio non è al momento configurato. Riprova più tardi.');
      return;
    }

    // Build messages for LLM
    const llmMessages = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    llmMessages.push({ role: 'user', content: userText });

    // Call LLM
    const response = await routeLlm({
      provider,
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
    console.error('Webhook handler error:', err);
  }
}

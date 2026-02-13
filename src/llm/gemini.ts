import { GoogleGenAI } from '@google/genai';
import type { LlmRequest } from '../types.js';
import { logger } from '../logger.js';

// Singleton clients keyed by API key
const clients = new Map<string, GoogleGenAI>();

function getClient(apiKey: string): GoogleGenAI {
  let client = clients.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({ apiKey });
    clients.set(apiKey, client);
  }
  return client;
}

export async function callGemini(request: LlmRequest): Promise<string> {
  try {
    const ai = getClient(request.apiKey);

    // Build conversation history for Gemini format
    const history = request.messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }));

    const lastMessage = request.messages[request.messages.length - 1];

    const chat = ai.chats.create({
      model: request.model,
      history,
      config: {
        systemInstruction: request.systemPrompt || undefined,
      },
    });

    const response = await chat.sendMessage({ message: lastMessage.content });

    return response.text || 'Non sono riuscito a generare una risposta.';
  } catch (err) {
    logger.error({ err, provider: 'gemini', model: request.model }, 'Gemini API call failed');
    throw new Error(`Gemini API error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

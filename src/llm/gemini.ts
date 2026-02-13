import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LlmRequest } from '../types.js';
import { logger } from '../logger.js';

// Singleton clients keyed by API key
const clients = new Map<string, GoogleGenerativeAI>();

function getClient(apiKey: string): GoogleGenerativeAI {
  let client = clients.get(apiKey);
  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
    clients.set(apiKey, client);
  }
  return client;
}

export async function callGemini(request: LlmRequest): Promise<string> {
  try {
    const client = getClient(request.apiKey);
    const model = client.getGenerativeModel({ model: request.model });

    // Build conversation history for Gemini format
    const history = request.messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }));

    const lastMessage = request.messages[request.messages.length - 1];

    const chat = model.startChat({
      history,
      systemInstruction: request.systemPrompt || undefined,
    });

    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return response.text() || 'Non sono riuscito a generare una risposta.';
  } catch (err) {
    logger.error({ err, provider: 'gemini', model: request.model }, 'Gemini API call failed');
    throw new Error(`Gemini API error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

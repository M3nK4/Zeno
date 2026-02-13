import OpenAI from 'openai';
import type { LlmRequest } from '../types.js';
import { logger } from '../logger.js';

// Singleton clients keyed by API key
const clients = new Map<string, OpenAI>();

function getClient(apiKey: string): OpenAI {
  let client = clients.get(apiKey);
  if (!client) {
    client = new OpenAI({ apiKey });
    clients.set(apiKey, client);
  }
  return client;
}

export async function callOpenai(request: LlmRequest): Promise<string> {
  try {
    const client = getClient(request.apiKey);

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
      ...request.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const response = await client.chat.completions.create({
      model: request.model,
      messages,
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || 'Non sono riuscito a generare una risposta.';
  } catch (err) {
    logger.error({ err, provider: 'openai', model: request.model }, 'OpenAI API call failed');
    throw new Error(`OpenAI API error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

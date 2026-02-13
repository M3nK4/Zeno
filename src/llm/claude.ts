import Anthropic from '@anthropic-ai/sdk';
import type { LlmRequest } from '../types.js';
import { logger } from '../logger.js';

// Singleton clients keyed by API key
const clients = new Map<string, Anthropic>();

function getClient(apiKey: string): Anthropic {
  let client = clients.get(apiKey);
  if (!client) {
    client = new Anthropic({ apiKey });
    clients.set(apiKey, client);
  }
  return client;
}

export async function callClaude(request: LlmRequest): Promise<string> {
  try {
    const client = getClient(request.apiKey);

    const response = await client.messages.create({
      model: request.model,
      max_tokens: 1024,
      system: request.systemPrompt,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock?.text || 'Non sono riuscito a generare una risposta.';
  } catch (err) {
    logger.error({ err, provider: 'claude', model: request.model }, 'Claude API call failed');
    throw new Error(`Claude API error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

import { callClaude } from './claude.js';
import { callOpenai } from './openai.js';
import type { LlmRequest } from '../types.js';

export type { LlmRequest } from '../types.js';

export async function routeLlm(request: LlmRequest): Promise<string> {
  switch (request.provider) {
    case 'claude':
      return callClaude(request);
    case 'openai':
      return callOpenai(request);
    default:
      throw new Error(`Unknown LLM provider: ${request.provider}`);
  }
}

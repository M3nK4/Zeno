import { callGemini } from './gemini.js';
import type { LlmRequest } from '../types.js';

export type { LlmRequest } from '../types.js';

export async function routeLlm(request: LlmRequest): Promise<string> {
  return callGemini(request);
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LlmRequest } from '../src/types.js';

// Mock the Gemini provider
const mockCallGemini = vi.fn();

vi.mock('../src/llm/gemini.js', () => ({
  callGemini: (...args: unknown[]) => mockCallGemini(...args),
}));

import { routeLlm } from '../src/llm/router.js';

function createRequest(): LlmRequest {
  return {
    model: 'gemini-2.5-flash',
    apiKey: 'test-key',
    systemPrompt: 'Sei un assistente AI.',
    messages: [{ role: 'user', content: 'Ciao' }],
  };
}

describe('LLM Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Gemini and returns response', async () => {
    mockCallGemini.mockResolvedValue('Ciao! Come posso aiutarti?');

    const request = createRequest();
    const result = await routeLlm(request);

    expect(result).toBe('Ciao! Come posso aiutarti?');
    expect(mockCallGemini).toHaveBeenCalledWith(request);
  });

  it('propagates errors from Gemini', async () => {
    mockCallGemini.mockRejectedValue(new Error('Gemini API error: quota exceeded'));

    const request = createRequest();
    await expect(routeLlm(request)).rejects.toThrow('Gemini API error: quota exceeded');
  });

  it('passes the full request object to Gemini', async () => {
    mockCallGemini.mockResolvedValue('Risposta');

    const request: LlmRequest = {
      model: 'gemini-2.5-pro',
      apiKey: 'AIza-test123',
      systemPrompt: 'Prompt personalizzato',
      messages: [
        { role: 'user', content: 'Domanda 1' },
        { role: 'assistant', content: 'Risposta 1' },
        { role: 'user', content: 'Domanda 2' },
      ],
    };

    await routeLlm(request);

    expect(mockCallGemini).toHaveBeenCalledWith(request);
    const passedRequest = mockCallGemini.mock.calls[0][0] as LlmRequest;
    expect(passedRequest.model).toBe('gemini-2.5-pro');
    expect(passedRequest.apiKey).toBe('AIza-test123');
    expect(passedRequest.messages).toHaveLength(3);
  });
});

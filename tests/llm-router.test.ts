import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LlmRequest } from '../src/types.js';

// Mock the LLM providers
const mockCallClaude = vi.fn();
const mockCallOpenai = vi.fn();

vi.mock('../src/llm/claude.js', () => ({
  callClaude: (...args: unknown[]) => mockCallClaude(...args),
}));

vi.mock('../src/llm/openai.js', () => ({
  callOpenai: (...args: unknown[]) => mockCallOpenai(...args),
}));

import { routeLlm } from '../src/llm/router.js';

function createRequest(provider: string): LlmRequest {
  return {
    provider,
    model: 'test-model',
    apiKey: 'test-key',
    systemPrompt: 'Sei un assistente AI.',
    messages: [{ role: 'user', content: 'Ciao' }],
  };
}

describe('LLM Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('routing to Claude', () => {
    it('calls callClaude when provider is "claude"', async () => {
      mockCallClaude.mockResolvedValue('Ciao! Come posso aiutarti?');

      const request = createRequest('claude');
      const result = await routeLlm(request);

      expect(result).toBe('Ciao! Come posso aiutarti?');
      expect(mockCallClaude).toHaveBeenCalledWith(request);
      expect(mockCallOpenai).not.toHaveBeenCalled();
    });

    it('propagates errors from Claude provider', async () => {
      mockCallClaude.mockRejectedValue(new Error('Claude API error: rate limited'));

      const request = createRequest('claude');
      await expect(routeLlm(request)).rejects.toThrow('Claude API error: rate limited');
    });
  });

  describe('routing to OpenAI', () => {
    it('calls callOpenai when provider is "openai"', async () => {
      mockCallOpenai.mockResolvedValue('Ciao! Sono GPT.');

      const request = createRequest('openai');
      const result = await routeLlm(request);

      expect(result).toBe('Ciao! Sono GPT.');
      expect(mockCallOpenai).toHaveBeenCalledWith(request);
      expect(mockCallClaude).not.toHaveBeenCalled();
    });

    it('propagates errors from OpenAI provider', async () => {
      mockCallOpenai.mockRejectedValue(new Error('OpenAI API error: invalid key'));

      const request = createRequest('openai');
      await expect(routeLlm(request)).rejects.toThrow('OpenAI API error: invalid key');
    });
  });

  describe('unknown provider', () => {
    it('throws error for unknown provider', async () => {
      const request = createRequest('gemini');
      await expect(routeLlm(request)).rejects.toThrow('Unknown LLM provider: gemini');
    });

    it('throws error for empty provider', async () => {
      const request = createRequest('');
      await expect(routeLlm(request)).rejects.toThrow('Unknown LLM provider: ');
    });
  });

  describe('request passthrough', () => {
    it('passes the full request object to the provider', async () => {
      mockCallClaude.mockResolvedValue('Risposta');

      const request: LlmRequest = {
        provider: 'claude',
        model: 'claude-sonnet-4-5-20250514',
        apiKey: 'sk-ant-test123',
        systemPrompt: 'Prompt personalizzato',
        messages: [
          { role: 'user', content: 'Domanda 1' },
          { role: 'assistant', content: 'Risposta 1' },
          { role: 'user', content: 'Domanda 2' },
        ],
      };

      await routeLlm(request);

      expect(mockCallClaude).toHaveBeenCalledWith(request);
      const passedRequest = mockCallClaude.mock.calls[0][0] as LlmRequest;
      expect(passedRequest.model).toBe('claude-sonnet-4-5-20250514');
      expect(passedRequest.apiKey).toBe('sk-ant-test123');
      expect(passedRequest.messages).toHaveLength(3);
    });
  });
});

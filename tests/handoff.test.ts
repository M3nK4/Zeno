import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module under test
const mockGetConfig = vi.fn();
const mockGetSmtpConfig = vi.fn();
const mockGetHistory = vi.fn();

vi.mock('../src/database/settings.js', () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  getSmtpConfig: (...args: unknown[]) => mockGetSmtpConfig(...args),
}));

vi.mock('../src/database/conversations.js', () => ({
  getHistory: (...args: unknown[]) => mockGetHistory(...args),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

vi.mock('../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { checkHandoff } from '../src/handoff/notify.js';

describe('Handoff - keyword detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('keyword matching', () => {
    it('returns true when user message contains a handoff keyword', async () => {
      mockGetConfig.mockImplementation((key: string) => {
        if (key === 'handoff_keywords') return 'operatore,parlare con umano';
        if (key === 'handoff_email') return 'admin@zerox.technology';
        return null;
      });
      mockGetSmtpConfig.mockReturnValue({
        host: 'smtp.test.com',
        port: 587,
        user: 'user@test.com',
        pass: 'pass',
        from: 'noreply@zerox.technology',
      });
      mockGetHistory.mockReturnValue([]);

      const result = await checkHandoff('393331234567', 'Vorrei parlare con un operatore');
      expect(result).toBe(true);
    });

    it('returns false when no keyword matches', async () => {
      mockGetConfig.mockImplementation((key: string) => {
        if (key === 'handoff_keywords') return 'operatore,parlare con umano';
        return null;
      });

      const result = await checkHandoff('393331234567', 'Qual e il prezzo del servizio?');
      expect(result).toBe(false);
    });

    it('performs case-insensitive matching', async () => {
      mockGetConfig.mockImplementation((key: string) => {
        if (key === 'handoff_keywords') return 'operatore';
        if (key === 'handoff_email') return 'admin@zerox.technology';
        return null;
      });
      mockGetSmtpConfig.mockReturnValue({
        host: 'smtp.test.com',
        port: 587,
        user: 'user@test.com',
        pass: 'pass',
        from: 'noreply@zerox.technology',
      });
      mockGetHistory.mockReturnValue([]);

      const result = await checkHandoff('393331234567', 'Voglio un OPERATORE adesso');
      expect(result).toBe(true);
    });
  });

  describe('empty/missing keywords', () => {
    it('returns false when handoff_keywords is empty string', async () => {
      mockGetConfig.mockReturnValue('');

      const result = await checkHandoff('393331234567', 'operatore');
      expect(result).toBe(false);
    });

    it('returns false when handoff_keywords is null', async () => {
      mockGetConfig.mockReturnValue(null);

      const result = await checkHandoff('393331234567', 'operatore');
      expect(result).toBe(false);
    });

    it('returns false when handoff_keywords is whitespace-only', async () => {
      mockGetConfig.mockReturnValue('   ');

      const result = await checkHandoff('393331234567', 'operatore');
      expect(result).toBe(false);
    });
  });

  describe('email configuration', () => {
    it('returns true even when handoff_email is not configured', async () => {
      mockGetConfig.mockImplementation((key: string) => {
        if (key === 'handoff_keywords') return 'operatore';
        if (key === 'handoff_email') return null;
        return null;
      });

      const result = await checkHandoff('393331234567', 'Vorrei un operatore');
      // Should still return true (handoff triggered) even if email is missing
      expect(result).toBe(true);
    });
  });

  describe('multiple keywords', () => {
    it('matches any keyword in the comma-separated list', async () => {
      mockGetConfig.mockImplementation((key: string) => {
        if (key === 'handoff_keywords') return 'operatore,assistenza umana,human,parlare con persona';
        if (key === 'handoff_email') return 'test@test.com';
        return null;
      });
      mockGetSmtpConfig.mockReturnValue({
        host: 'smtp.test.com',
        port: 587,
        user: 'user@test.com',
        pass: 'pass',
        from: 'noreply@zerox.technology',
      });
      mockGetHistory.mockReturnValue([]);

      const result = await checkHandoff('393331234567', 'Ho bisogno di assistenza umana');
      expect(result).toBe(true);
    });

    it('handles keywords with extra whitespace', async () => {
      mockGetConfig.mockImplementation((key: string) => {
        if (key === 'handoff_keywords') return '  operatore  ,  human  ';
        if (key === 'handoff_email') return 'test@test.com';
        return null;
      });
      mockGetSmtpConfig.mockReturnValue({
        host: 'smtp.test.com',
        port: 587,
        user: 'user@test.com',
        pass: 'pass',
        from: 'noreply@zerox.technology',
      });
      mockGetHistory.mockReturnValue([]);

      const result = await checkHandoff('393331234567', 'I need a human');
      expect(result).toBe(true);
    });
  });
});

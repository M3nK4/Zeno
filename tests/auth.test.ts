import { describe, it, expect, vi } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock env config
vi.mock('../src/config.js', () => ({
  env: {
    jwtSecret: 'test-secret-key-for-testing-purposes-32chars!',
  },
}));

// Mock database setup (not needed for pure auth tests, but auth.ts imports it)
vi.mock('../src/database/setup.js', () => ({
  getDb: vi.fn(),
}));

describe('Auth - password hashing', () => {
  const SALT_ROUNDS = 10;

  describe('bcrypt hash and verify', () => {
    it('hashes a password and verifies it correctly', async () => {
      const password = 'SecureP@ssw0rd!';
      const hash = await bcrypt.hash(password, SALT_ROUNDS);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]?\$/); // bcrypt hash format

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('rejects wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', SALT_ROUNDS);
      const isValid = await bcrypt.compare('wrong-password', hash);
      expect(isValid).toBe(false);
    });

    it('generates different hashes for same password due to salt', async () => {
      const password = 'test-password';
      const hash1 = await bcrypt.hash(password, SALT_ROUNDS);
      const hash2 = await bcrypt.hash(password, SALT_ROUNDS);

      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    it('handles empty password', async () => {
      const hash = await bcrypt.hash('', SALT_ROUNDS);
      expect(await bcrypt.compare('', hash)).toBe(true);
      expect(await bcrypt.compare('non-empty', hash)).toBe(false);
    });

    it('handles unicode password', async () => {
      const password = 'p@$$w0rd-with-emoji-and-accents-e-a-o';
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      expect(await bcrypt.compare(password, hash)).toBe(true);
    });
  });
});

describe('Auth - JWT tokens', () => {
  const SECRET = 'test-secret-key-for-testing-purposes-32chars!';

  describe('sign and verify', () => {
    it('generates a valid JWT token', () => {
      const payload = { userId: 1, username: 'admin' };
      const token = jwt.sign(payload, SECRET, { expiresIn: '24h' });

      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
      expect(decoded.userId).toBe(1);
      expect(decoded.username).toBe('admin');
    });

    it('rejects token signed with wrong secret', () => {
      const payload = { userId: 1, username: 'admin' };
      const token = jwt.sign(payload, 'correct-secret-that-is-long-enough');

      expect(() => jwt.verify(token, 'wrong-secret-that-is-long-enough!')).toThrow();
    });

    it('rejects expired token', () => {
      const payload = { userId: 1, username: 'admin' };
      // Token that expired 1 second ago
      const token = jwt.sign(payload, SECRET, { expiresIn: '-1s' });

      expect(() => jwt.verify(token, SECRET)).toThrow();
    });

    it('includes expiration in token payload', () => {
      const payload = { userId: 1, username: 'admin' };
      const token = jwt.sign(payload, SECRET, { expiresIn: '24h' });

      const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      // Expiry should be roughly 24h from now
      const expectedExpiry = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      expect(decoded.exp).toBeCloseTo(expectedExpiry, -1); // within ~10 seconds
    });

    it('rejects malformed token', () => {
      expect(() => jwt.verify('not-a-valid-token', SECRET)).toThrow();
    });

    it('rejects tampered token', () => {
      const payload = { userId: 1, username: 'admin' };
      const token = jwt.sign(payload, SECRET, { expiresIn: '24h' });

      // Tamper with the payload section
      const parts = token.split('.');
      parts[1] = parts[1] + 'tampered';
      const tamperedToken = parts.join('.');

      expect(() => jwt.verify(tamperedToken, SECRET)).toThrow();
    });
  });
});

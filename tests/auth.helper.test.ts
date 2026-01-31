import { authHelper } from '../src/helpers/auth.helper.js';

describe('Auth Helper', () => {
  const testPassword = 'testPassword123';
  let hashedPassword: string;

  describe('hashPassword', () => {
    it('should hash a password', () => {
      hashedPassword = authHelper.hashPassword(testPassword);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(testPassword);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for same password', () => {
      const hash1 = authHelper.hashPassword(testPassword);
      const hash2 = authHelper.hashPassword(testPassword);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('passwordVerify', () => {
    it('should return true for correct password', async () => {
      const hash = authHelper.hashPassword(testPassword);
      const result = await authHelper.passwordVerify(testPassword, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = authHelper.hashPassword(testPassword);
      const result = await authHelper.passwordVerify('wrongPassword', hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = authHelper.generateToken(
        'testuser',
        'test@example.com',
        'user-id-123',
        'CUSTOMER'
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = authHelper.generateToken(
        'testuser',
        'test@example.com',
        'user-id-123',
        'CUSTOMER'
      );

      const decoded = authHelper.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.username).toBe('testuser');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.id).toBe('user-id-123');
      expect(decoded?.role).toBe('CUSTOMER');
    });

    it('should return null for invalid token', () => {
      const decoded = authHelper.verifyToken('invalid-token');

      expect(decoded).toBeNull();
    });

    it('should return null for tampered token', () => {
      const token = authHelper.generateToken(
        'testuser',
        'test@example.com',
        'user-id-123',
        'CUSTOMER'
      );

      // Tamper with the token
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      const decoded = authHelper.verifyToken(tamperedToken);

      expect(decoded).toBeNull();
    });
  });
});

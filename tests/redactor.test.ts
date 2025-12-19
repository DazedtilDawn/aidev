import { describe, it, expect } from 'vitest';
import { SecretRedactor } from '../src/security/redactor.js';

describe('SecretRedactor', () => {
  const redactor = new SecretRedactor();

  it('redacts API keys', () => {
    const content = 'const API_KEY = "sk-1234567890abcdef1234567890abcdef";';
    const result = redactor.redact(content);
    expect(result.content).not.toContain('sk-1234567890');
    expect(result.content).toContain('[REDACTED:api_key]');
    // May match multiple patterns (generic_api_key and openai_key)
    expect(result.redactions.length).toBeGreaterThanOrEqual(1);
  });

  it('redacts passwords', () => {
    const content = 'password = "SuperSecret123!"';
    const result = redactor.redact(content);
    expect(result.content).not.toContain('SuperSecret123');
    expect(result.content).toContain('[REDACTED:password]');
  });

  it('redacts private keys', () => {
    const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...';
    const result = redactor.redact(content);
    expect(result.content).toContain('[REDACTED:private_key]');
  });

  it('redacts GitHub tokens', () => {
    const content = 'GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const result = redactor.redact(content);
    expect(result.content).toContain('[REDACTED:token]');
  });

  it('redacts database connection strings', () => {
    const content = 'DATABASE_URL=postgres://user:pass123@localhost:5432/db';
    const result = redactor.redact(content);
    expect(result.content).toContain('[REDACTED:connection_string]');
  });

  it('preserves non-secret content', () => {
    const content = 'const username = "john_doe";';
    const result = redactor.redact(content);
    expect(result.content).toBe(content);
    expect(result.redactions).toHaveLength(0);
  });

  it('tracks redaction metadata', () => {
    const content = 'API_KEY=sk-test123456789012345678901234';
    const result = redactor.redact(content);
    expect(result.redactions[0]).toMatchObject({
      type: 'api_key',
      line: 1,
    });
  });

  it('handles multiple secrets in same content', () => {
    const content = `
API_KEY=sk-test123456789012345678901234
password="secret123"
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
`;
    const result = redactor.redact(content);
    expect(result.redactions.length).toBeGreaterThanOrEqual(3);
  });

  // Additional pattern tests added per code review
  describe('additional secret patterns', () => {
    it('redacts Google API keys', () => {
      const content = 'GOOGLE_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuv';
      const result = redactor.redact(content);
      expect(result.content).toContain('[REDACTED:api_key]');
    });

    it('redacts Stripe live keys', () => {
      // Construct dynamically to avoid GitHub Push Protection false positive
      const fakeKey = ['sk', 'live', '0'.repeat(26)].join('_');
      const content = `STRIPE_SECRET_KEY=${fakeKey}`;
      const result = redactor.redact(content);
      expect(result.content).toContain('[REDACTED:api_key]');
    });

    it('redacts Stripe test keys', () => {
      // Construct dynamically to avoid GitHub Push Protection false positive
      const fakeKey = ['sk', 'test', '0'.repeat(26)].join('_');
      const content = `STRIPE_TEST_KEY=${fakeKey}`;
      const result = redactor.redact(content);
      expect(result.content).toContain('[REDACTED:api_key]');
    });

    it('redacts SendGrid keys', () => {
      const content = 'SENDGRID_API_KEY=SG.abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuvwxyz1234567890abc';
      const result = redactor.redact(content);
      expect(result.content).toContain('[REDACTED:api_key]');
    });

    it('redacts Azure connection strings', () => {
      const content = 'AZURE_STORAGE=DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefgh==';
      const result = redactor.redact(content);
      expect(result.content).toContain('[REDACTED:connection_string]');
    });

    it('redacts basic auth URLs', () => {
      const content = 'WEBHOOK_URL=https://user:secretpassword123@api.example.com/webhook';
      const result = redactor.redact(content);
      expect(result.content).toContain('[REDACTED:credential]');
    });

    it('redacts npm tokens', () => {
      const content = 'NPM_TOKEN=npm_abcdefghijklmnopqrstuvwxyz1234567890';
      const result = redactor.redact(content);
      expect(result.content).toContain('[REDACTED:token]');
    });

    it('redacts PyPI tokens (85+ chars boundary test)', () => {
      // PyPI tokens are 85+ chars after the prefix - test the boundary case
      const token = 'pypi-' + 'a'.repeat(90); // 95 chars total
      const content = `PYPI_TOKEN=${token}`;
      const result = redactor.redact(content);
      expect(result.content).toContain('[REDACTED:token]');
      expect(result.content).not.toContain(token);
    });

    it('redacts JWT tokens', () => {
      const content = 'AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const result = redactor.redact(content);
      expect(result.content).toContain('[REDACTED:token]');
    });

    it('preserves legitimate code that looks like secrets', () => {
      // Short strings shouldn't match
      const content = 'const sk = "short";';
      const result = redactor.redact(content);
      expect(result.content).toBe(content);
    });
  });
});

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
});

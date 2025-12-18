export interface SecretPattern {
  name: string;
  type: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Expanded patterns per ChatGPT review - added GitHub, Slack, DB connection strings
export const DEFAULT_PATTERNS: SecretPattern[] = [
  {
    name: 'generic_api_key',
    type: 'api_key',
    pattern: /(?:api[_-]?key|apikey)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
    severity: 'high',
  },
  {
    name: 'openai_key',
    type: 'api_key',
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    severity: 'high',
  },
  {
    name: 'anthropic_key',
    type: 'api_key',
    pattern: /sk-ant-[a-zA-Z0-9\-]{20,}/g,
    severity: 'high',
  },
  {
    name: 'github_token',
    type: 'token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
  },
  {
    name: 'github_oauth',
    type: 'token',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
  },
  {
    name: 'slack_token',
    type: 'token',
    pattern: /xox[baprs]-[a-zA-Z0-9\-]{10,}/g,
    severity: 'critical',
  },
  {
    name: 'slack_webhook',
    type: 'url',
    pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[a-zA-Z0-9]+/g,
    severity: 'high',
  },
  {
    name: 'password_assignment',
    type: 'password',
    pattern: /(?:password|passwd|pwd)["']?\s*[:=]\s*["']([^"'\s]{8,})["']/gi,
    severity: 'high',
  },
  {
    name: 'database_url',
    type: 'connection_string',
    pattern: /(?:postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@[^\s"']+/gi,
    severity: 'critical',
  },
  {
    name: 'private_key_header',
    type: 'private_key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    severity: 'critical',
  },
  {
    name: 'aws_access_key',
    type: 'aws_key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
  },
  {
    name: 'aws_secret_key',
    type: 'aws_key',
    pattern: /(?:aws_secret|secret_access_key)["']?\s*[:=]\s*["']?([a-zA-Z0-9\/+=]{40})["']?/gi,
    severity: 'critical',
  },
  {
    name: 'jwt_token',
    type: 'token',
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    severity: 'high',
  },
  {
    name: 'bearer_token',
    type: 'token',
    pattern: /Bearer\s+[a-zA-Z0-9\-_\.]{20,}/gi,
    severity: 'medium',
  },
];

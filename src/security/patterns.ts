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
  // Additional patterns added per code review
  {
    name: 'google_api_key',
    type: 'api_key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/g,
    severity: 'high',
  },
  {
    name: 'stripe_live_key',
    type: 'api_key',
    pattern: /sk_live_[a-zA-Z0-9]{24,}/g,
    severity: 'critical',
  },
  {
    name: 'stripe_test_key',
    type: 'api_key',
    pattern: /sk_test_[a-zA-Z0-9]{24,}/g,
    severity: 'high',
  },
  {
    name: 'stripe_publishable_key',
    type: 'api_key',
    pattern: /pk_live_[a-zA-Z0-9]{24,}/g,
    severity: 'medium',
  },
  {
    name: 'sendgrid_key',
    type: 'api_key',
    pattern: /SG\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}/g,
    severity: 'high',
  },
  {
    name: 'twilio_token',
    type: 'token',
    pattern: /SK[a-f0-9]{32}/g,
    severity: 'high',
  },
  {
    name: 'discord_token',
    type: 'token',
    pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g,
    severity: 'critical',
  },
  {
    name: 'heroku_api_key',
    type: 'api_key',
    pattern: /[hH]eroku[a-zA-Z0-9_\-]*["']?\s*[:=]\s*["']?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}["']?/gi,
    severity: 'high',
  },
  {
    name: 'azure_connection_string',
    type: 'connection_string',
    pattern: /DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[a-zA-Z0-9+\/=]{40,}/gi,
    severity: 'critical',
  },
  {
    name: 'basic_auth_url',
    type: 'credential',
    pattern: /https?:\/\/[^:]+:[^@]+@[^\s"']+/gi,
    severity: 'high',
  },
  {
    name: 'npm_token',
    type: 'token',
    pattern: /npm_[a-zA-Z0-9]{36}/g,
    severity: 'high',
  },
  {
    name: 'pypi_token',
    type: 'token',
    pattern: /pypi-[A-Za-z0-9_\-]{85,}/g,
    severity: 'high',
  },
];

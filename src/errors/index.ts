export class AidevError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AidevError';
  }
}

export class ConfigError extends AidevError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

export class GitError extends AidevError {
  constructor(message: string) {
    super(message, 'GIT_ERROR');
    this.name = 'GitError';
  }
}

export class ParseError extends AidevError {
  constructor(message: string, public readonly file?: string) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}

export class ScanError extends AidevError {
  constructor(message: string, public readonly file?: string) {
    super(message, 'SCAN_ERROR');
    this.name = 'ScanError';
  }
}

export class SecurityError extends AidevError {
  constructor(message: string) {
    super(message, 'SECURITY_ERROR');
    this.name = 'SecurityError';
  }
}

// Exit code mapping
const EXIT_CODES: Record<string, number> = {
  ConfigError: 10,
  GitError: 20,
  ParseError: 30,
  ScanError: 40,
  SecurityError: 50,
  AidevError: 1,
};

export function exitCodeFor(err: Error): number {
  return EXIT_CODES[err.name] ?? 1;
}

export function formatError(err: Error, format: 'json' | 'text' = 'text'): string {
  const exitCode = exitCodeFor(err);

  if (format === 'json') {
    return JSON.stringify({
      error: err.name,
      message: err.message,
      exitCode,
      ...(err instanceof ParseError && err.file ? { file: err.file } : {}),
      ...(err instanceof ScanError && err.file ? { file: err.file } : {}),
    }, null, 2);
  }

  return `Error [${err.name}]: ${err.message}`;
}

/**
 * Information about an import statement.
 */
export interface ImportInfo {
  /** The module specifier (e.g., './utils', 'react', '../config') */
  source: string;
  /** Imported symbols (e.g., ['foo', 'bar'] for `import { foo, bar }`) */
  symbols: string[];
  /** Whether this is a default import */
  isDefault: boolean;
  /** Whether this is a namespace import (import * as x) */
  isNamespace: boolean;
  /** Line number where the import appears */
  line: number;
}

/**
 * Results from scanning a source file.
 */
export interface ScanResult {
  /** Import statements found in the file */
  imports: ImportInfo[];
  /** Exported symbols (functions, classes, constants, types) */
  exports: string[];
  /** Function/method calls detected */
  calls: string[];
  /** Type references (for TypeScript) */
  typeReferences: string[];
}

/**
 * Interface for language-specific source code scanners.
 */
export interface LanguageScanner {
  /** Scanner name (e.g., 'typescript', 'python') */
  readonly name: string;
  /** File extensions this scanner handles (e.g., ['.ts', '.tsx']) */
  readonly extensions: string[];

  /**
   * Scan a source file and extract structural information.
   *
   * @param path - File path (used for extension detection and error reporting)
   * @param content - File content to scan
   * @returns Scan results with imports, exports, calls, and type references
   */
  scan(path: string, content: string): ScanResult;
}

/**
 * Create an empty scan result.
 */
export function emptyScanResult(): ScanResult {
  return {
    imports: [],
    exports: [],
    calls: [],
    typeReferences: [],
  };
}

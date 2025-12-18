import { LanguageScanner, ScanResult, ImportInfo, emptyScanResult } from './base.js';

/**
 * Python source code scanner using regex-based extraction.
 * Since we're in Node.js, we use regex rather than Python AST.
 */
export class PythonScanner implements LanguageScanner {
  readonly name = 'python';
  readonly extensions = ['.py', '.pyi'];

  scan(path: string, content: string): ScanResult {
    if (!content.trim()) {
      return emptyScanResult();
    }

    return {
      imports: this.extractImports(content),
      exports: this.extractDefinitions(content),
      calls: this.extractCalls(content),
      typeReferences: [], // Python type hints would need more complex parsing
    };
  }

  private extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) continue;

      // Handle: import module
      // Handle: import module as alias
      const simpleMatch = line.match(/^import\s+([\w.]+)(?:\s+as\s+\w+)?$/);
      if (simpleMatch) {
        imports.push({
          source: simpleMatch[1],
          symbols: [simpleMatch[1].split('.').pop()!],
          isDefault: false,
          isNamespace: true,
          line: lineNum,
        });
        continue;
      }

      // Handle: from module import symbol1, symbol2
      // Handle: from module import symbol as alias
      // Handle: from module import *
      const fromMatch = line.match(/^from\s+(\.{0,3}[\w.]*)\s+import\s+(.+)$/);
      if (fromMatch) {
        const source = fromMatch[1] || '.';
        const importPart = fromMatch[2];

        // Remove inline comments
        const cleanImportPart = importPart.split('#')[0].trim();

        // Check for star import
        if (cleanImportPart === '*') {
          imports.push({
            source,
            symbols: ['*'],
            isDefault: false,
            isNamespace: true,
            line: lineNum,
          });
          continue;
        }

        // Parse symbols (handle 'as' aliases)
        const symbols = cleanImportPart
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => {
            // Remove 'as alias' part
            const asMatch = s.match(/^(\w+)(?:\s+as\s+\w+)?$/);
            return asMatch ? asMatch[1] : s;
          })
          .filter(s => s && !s.includes('(') && !s.includes(')')); // Filter out parentheses from multiline

        if (symbols.length > 0) {
          imports.push({
            source,
            symbols,
            isDefault: false,
            isNamespace: false,
            line: lineNum,
          });
        }
        continue;
      }
    }

    return imports;
  }

  private extractDefinitions(content: string): string[] {
    const exports: string[] = [];

    // Function definitions: def name( or async def name(
    const funcRegex = /^(?:async\s+)?def\s+(\w+)\s*\(/gm;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const name = match[1];
      // Exclude private functions (single underscore prefix) but allow dunder methods
      if (!name.startsWith('_') || (name.startsWith('__') && name.endsWith('__'))) {
        // Actually, let's keep it simple: exclude single underscore prefix only
        if (!name.startsWith('_')) {
          exports.push(name);
        }
      }
    }

    // Class definitions: class Name( or class Name:
    const classRegex = /^class\s+(\w+)[\s:(]/gm;
    while ((match = classRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return [...new Set(exports)]; // Deduplicate
  }

  private extractCalls(content: string): string[] {
    const calls: string[] = [];

    // Match function calls: name(
    const callRegex = /\b(\w+)\s*\(/g;
    let match;

    // Python keywords that look like function calls but aren't
    const keywords = new Set([
      'if', 'elif', 'else', 'while', 'for', 'with', 'try', 'except',
      'finally', 'def', 'class', 'async', 'await', 'return', 'yield',
      'raise', 'import', 'from', 'as', 'pass', 'break', 'continue',
      'lambda', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None',
      'assert', 'del', 'global', 'nonlocal', 'match', 'case',
    ]);

    while ((match = callRegex.exec(content)) !== null) {
      const name = match[1];
      if (!keywords.has(name)) {
        calls.push(name);
      }
    }

    return [...new Set(calls)]; // Deduplicate
  }
}

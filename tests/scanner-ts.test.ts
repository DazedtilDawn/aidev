import { describe, it, expect } from 'vitest';
import { TypeScriptScanner } from '../src/scanners/typescript.js';

describe('TypeScript Scanner', () => {
  const scanner = new TypeScriptScanner();

  describe('imports', () => {
    it('extracts named imports', () => {
      const code = `import { foo, bar } from './utils';`;
      const result = scanner.scan('test.ts', code);
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toMatchObject({
        source: './utils',
        symbols: ['foo', 'bar'],
        isDefault: false,
        isNamespace: false,
      });
    });

    it('extracts default imports', () => {
      const code = `import React from 'react';`;
      const result = scanner.scan('test.tsx', code);
      expect(result.imports[0]).toMatchObject({
        source: 'react',
        symbols: ['React'],
        isDefault: true,
      });
    });

    it('extracts namespace imports', () => {
      const code = `import * as path from 'path';`;
      const result = scanner.scan('test.ts', code);
      expect(result.imports[0]).toMatchObject({
        source: 'path',
        symbols: ['path'],
        isNamespace: true,
      });
    });

    it('extracts mixed imports', () => {
      const code = `import React, { useState, useEffect } from 'react';`;
      const result = scanner.scan('test.tsx', code);
      expect(result.imports[0].symbols).toContain('React');
      expect(result.imports[0].symbols).toContain('useState');
      expect(result.imports[0].symbols).toContain('useEffect');
    });

    it('extracts relative imports', () => {
      const code = `
import { helper } from './utils';
import { config } from '../config';
import { shared } from '../../shared/index';
      `;
      const result = scanner.scan('test.ts', code);
      expect(result.imports).toHaveLength(3);
      expect(result.imports.map(i => i.source)).toEqual([
        './utils',
        '../config',
        '../../shared/index',
      ]);
    });
  });

  describe('exports', () => {
    it('extracts exported functions', () => {
      const code = `export function myFunc() { return 1; }`;
      const result = scanner.scan('test.ts', code);
      expect(result.exports).toContain('myFunc');
    });

    it('extracts exported constants', () => {
      const code = `export const MY_CONST = 1;`;
      const result = scanner.scan('test.ts', code);
      expect(result.exports).toContain('MY_CONST');
    });

    it('extracts exported classes', () => {
      const code = `export class MyClass { }`;
      const result = scanner.scan('test.ts', code);
      expect(result.exports).toContain('MyClass');
    });

    it('extracts exported types', () => {
      const code = `export type MyType = string;`;
      const result = scanner.scan('test.ts', code);
      expect(result.exports).toContain('MyType');
    });

    it('extracts exported interfaces', () => {
      const code = `export interface MyInterface { name: string; }`;
      const result = scanner.scan('test.ts', code);
      expect(result.exports).toContain('MyInterface');
    });

    it('extracts re-exports', () => {
      const code = `export { foo, bar } from './utils';`;
      const result = scanner.scan('test.ts', code);
      expect(result.exports).toContain('foo');
      expect(result.exports).toContain('bar');
    });

    it('extracts default exports', () => {
      const code = `
function main() { }
export default main;
      `;
      const result = scanner.scan('test.ts', code);
      expect(result.exports).toContain('default');
    });
  });

  describe('function calls', () => {
    it('detects function calls', () => {
      const code = `
import { helper } from './utils';
function main() {
  helper();
  console.log('test');
}
      `;
      const result = scanner.scan('test.ts', code);
      expect(result.calls).toContain('helper');
    });

    it('detects method calls', () => {
      const code = `
const result = arr.map(x => x * 2).filter(x => x > 0);
      `;
      const result = scanner.scan('test.ts', code);
      expect(result.calls).toContain('map');
      expect(result.calls).toContain('filter');
    });
  });

  describe('type references', () => {
    it('detects type references', () => {
      const code = `
import { User } from './types';
function getUser(): User {
  return { name: 'test' };
}
      `;
      const result = scanner.scan('test.ts', code);
      expect(result.typeReferences).toContain('User');
    });

    it('detects generic type parameters', () => {
      const code = `
const items: Array<string> = [];
const map: Map<string, number> = new Map();
      `;
      const result = scanner.scan('test.ts', code);
      expect(result.typeReferences).toContain('Array');
      expect(result.typeReferences).toContain('Map');
    });
  });

  describe('edge cases', () => {
    it('handles JSX files', () => {
      const code = `
import React from 'react';
export function Button({ label }) {
  return <button>{label}</button>;
}
      `;
      const result = scanner.scan('Button.tsx', code);
      expect(result.imports[0].source).toBe('react');
      expect(result.exports).toContain('Button');
    });

    it('handles empty file', () => {
      const result = scanner.scan('empty.ts', '');
      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
    });

    it('handles syntax errors gracefully', () => {
      const code = `import { from './broken`;
      // Should not throw, should return partial or empty results
      expect(() => scanner.scan('broken.ts', code)).not.toThrow();
    });
  });
});

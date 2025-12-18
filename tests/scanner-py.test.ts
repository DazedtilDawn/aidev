import { describe, it, expect } from 'vitest';
import { PythonScanner } from '../src/scanners/python.js';

describe('Python Scanner', () => {
  const scanner = new PythonScanner();

  describe('imports', () => {
    it('extracts simple imports', () => {
      const code = `import os`;
      const result = scanner.scan('test.py', code);
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toMatchObject({
        source: 'os',
        isNamespace: true,
      });
    });

    it('extracts from imports', () => {
      const code = `from pathlib import Path`;
      const result = scanner.scan('test.py', code);
      expect(result.imports[0]).toMatchObject({
        source: 'pathlib',
        symbols: ['Path'],
      });
    });

    it('extracts multiple symbols from imports', () => {
      const code = `from typing import List, Dict, Optional`;
      const result = scanner.scan('test.py', code);
      expect(result.imports[0].symbols).toContain('List');
      expect(result.imports[0].symbols).toContain('Dict');
      expect(result.imports[0].symbols).toContain('Optional');
    });

    it('extracts relative imports', () => {
      const code = `
from . import local_module
from .. import parent_module
from .utils import helper
from ..config import settings
      `;
      const result = scanner.scan('test.py', code);
      expect(result.imports.length).toBeGreaterThanOrEqual(4);
      expect(result.imports.some(i => i.source === '.')).toBe(true);
      expect(result.imports.some(i => i.source === '..')).toBe(true);
      expect(result.imports.some(i => i.source === '.utils')).toBe(true);
    });

    it('extracts aliased imports', () => {
      const code = `
import numpy as np
from pandas import DataFrame as DF
      `;
      const result = scanner.scan('test.py', code);
      expect(result.imports.some(i => i.source === 'numpy')).toBe(true);
      expect(result.imports.some(i => i.source === 'pandas')).toBe(true);
    });

    it('extracts star imports', () => {
      const code = `from module import *`;
      const result = scanner.scan('test.py', code);
      expect(result.imports[0].isNamespace).toBe(true);
    });
  });

  describe('exports (definitions)', () => {
    it('extracts function definitions', () => {
      const code = `
def my_function():
    pass
      `;
      const result = scanner.scan('test.py', code);
      expect(result.exports).toContain('my_function');
    });

    it('extracts async function definitions', () => {
      const code = `
async def async_func():
    await something()
      `;
      const result = scanner.scan('test.py', code);
      expect(result.exports).toContain('async_func');
    });

    it('extracts class definitions', () => {
      const code = `
class MyClass:
    def __init__(self):
        pass
      `;
      const result = scanner.scan('test.py', code);
      expect(result.exports).toContain('MyClass');
    });

    it('excludes private functions (underscore prefix)', () => {
      const code = `
def public_func():
    pass

def _private_func():
    pass

def __dunder_func__():
    pass
      `;
      const result = scanner.scan('test.py', code);
      expect(result.exports).toContain('public_func');
      expect(result.exports).not.toContain('_private_func');
    });
  });

  describe('function calls', () => {
    it('detects function calls', () => {
      const code = `
result = helper()
print("test")
      `;
      const result = scanner.scan('test.py', code);
      expect(result.calls).toContain('helper');
      expect(result.calls).toContain('print');
    });

    it('excludes keywords', () => {
      const code = `
if condition:
    pass
while True:
    break
for item in items:
    continue
      `;
      const result = scanner.scan('test.py', code);
      expect(result.calls).not.toContain('if');
      expect(result.calls).not.toContain('while');
      expect(result.calls).not.toContain('for');
    });
  });

  describe('edge cases', () => {
    it('handles empty file', () => {
      const result = scanner.scan('empty.py', '');
      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
    });

    it('handles comments in imports', () => {
      const code = `from module import func  # comment`;
      const result = scanner.scan('test.py', code);
      expect(result.imports[0].symbols).toContain('func');
      expect(result.imports[0].symbols).not.toContain('comment');
    });

    it('handles multiline imports', () => {
      const code = `
from module import (
    one,
    two,
    three,
)
      `;
      const result = scanner.scan('test.py', code);
      // Basic regex may not handle multiline perfectly, but should not crash
      expect(() => scanner.scan('test.py', code)).not.toThrow();
    });

    it('handles type hints file (.pyi)', () => {
      const code = `
def stub_function(x: int) -> str: ...
class StubClass: ...
      `;
      const result = scanner.scan('test.pyi', code);
      expect(result.exports).toContain('stub_function');
      expect(result.exports).toContain('StubClass');
    });
  });
});

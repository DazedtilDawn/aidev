import { parse, AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { LanguageScanner, ScanResult, ImportInfo, emptyScanResult } from './base.js';

/**
 * TypeScript/JavaScript AST scanner using @typescript-eslint/typescript-estree.
 * Extracts imports, exports, function calls, and type references.
 */
export class TypeScriptScanner implements LanguageScanner {
  readonly name = 'typescript';
  readonly extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

  scan(path: string, content: string): ScanResult {
    if (!content.trim()) {
      return emptyScanResult();
    }

    try {
      const ast = parse(content, {
        loc: true,
        range: true,
        jsx: path.endsWith('.tsx') || path.endsWith('.jsx'),
        // Don't error on type-only constructs in JS files
        allowInvalidAST: true,
      });

      const result = emptyScanResult();
      this.walkNode(ast, result);
      return result;
    } catch {
      // Fallback to regex for unparseable files
      return this.regexFallback(content);
    }
  }

  private walkNode(node: TSESTree.Node | null, result: ScanResult): void {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
      case AST_NODE_TYPES.ImportDeclaration:
        result.imports.push(this.parseImport(node));
        break;

      case AST_NODE_TYPES.ExportNamedDeclaration:
        this.parseExportNamed(node, result);
        break;

      case AST_NODE_TYPES.ExportDefaultDeclaration:
        result.exports.push('default');
        break;

      case AST_NODE_TYPES.CallExpression:
        this.parseCallExpression(node, result);
        break;

      case AST_NODE_TYPES.TSTypeReference:
        this.parseTypeReference(node, result);
        break;
    }

    // Walk child nodes
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue; // Avoid circular reference
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in (item as object)) {
            this.walkNode(item as TSESTree.Node, result);
          }
        }
      } else if (child && typeof child === 'object' && 'type' in (child as object)) {
        this.walkNode(child as TSESTree.Node, result);
      }
    }
  }

  private parseImport(node: TSESTree.ImportDeclaration): ImportInfo {
    const symbols: string[] = [];
    let isDefault = false;
    let isNamespace = false;

    for (const spec of node.specifiers || []) {
      switch (spec.type) {
        case AST_NODE_TYPES.ImportDefaultSpecifier:
          isDefault = true;
          symbols.push(spec.local.name);
          break;
        case AST_NODE_TYPES.ImportNamespaceSpecifier:
          isNamespace = true;
          symbols.push(spec.local.name);
          break;
        case AST_NODE_TYPES.ImportSpecifier:
          symbols.push(spec.imported.type === AST_NODE_TYPES.Identifier
            ? spec.imported.name
            : spec.local.name);
          break;
      }
    }

    return {
      source: node.source.value as string,
      symbols,
      isDefault,
      isNamespace,
      line: node.loc?.start?.line || 0,
    };
  }

  private parseExportNamed(node: TSESTree.ExportNamedDeclaration, result: ScanResult): void {
    // Handle: export { foo, bar }
    if (node.specifiers) {
      for (const spec of node.specifiers) {
        if (spec.type === AST_NODE_TYPES.ExportSpecifier) {
          const exported = spec.exported;
          if (exported.type === AST_NODE_TYPES.Identifier) {
            result.exports.push(exported.name);
          }
        }
      }
    }

    // Handle: export function foo() {}
    if (node.declaration) {
      const decl = node.declaration;

      switch (decl.type) {
        case AST_NODE_TYPES.FunctionDeclaration:
        case AST_NODE_TYPES.ClassDeclaration:
        case AST_NODE_TYPES.TSInterfaceDeclaration:
        case AST_NODE_TYPES.TSTypeAliasDeclaration:
        case AST_NODE_TYPES.TSEnumDeclaration:
          if (decl.id?.name) {
            result.exports.push(decl.id.name);
          }
          break;

        case AST_NODE_TYPES.VariableDeclaration:
          // Handle: export const foo = 1, bar = 2;
          for (const declarator of decl.declarations) {
            if (declarator.id.type === AST_NODE_TYPES.Identifier) {
              result.exports.push(declarator.id.name);
            }
          }
          break;
      }
    }
  }

  private parseCallExpression(node: TSESTree.CallExpression, result: ScanResult): void {
    const callee = node.callee;

    if (callee.type === AST_NODE_TYPES.Identifier) {
      // Direct call: foo()
      result.calls.push(callee.name);
    } else if (callee.type === AST_NODE_TYPES.MemberExpression) {
      // Method call: obj.method()
      if (callee.property.type === AST_NODE_TYPES.Identifier) {
        result.calls.push(callee.property.name);
      }
    }
  }

  private parseTypeReference(node: TSESTree.TSTypeReference, result: ScanResult): void {
    const typeName = node.typeName;

    if (typeName.type === AST_NODE_TYPES.Identifier) {
      result.typeReferences.push(typeName.name);
    } else if (typeName.type === AST_NODE_TYPES.TSQualifiedName) {
      // Handle qualified names like Namespace.Type
      let current = typeName.left;
      while (current.type === AST_NODE_TYPES.TSQualifiedName) {
        current = current.left;
      }
      if (current.type === AST_NODE_TYPES.Identifier) {
        result.typeReferences.push(current.name);
      }
    }
  }

  /**
   * Fallback regex-based extraction for files that fail to parse.
   */
  private regexFallback(content: string): ScanResult {
    const result = emptyScanResult();

    // Extract imports
    const importRegex = /import\s+(?:(?:(\w+)\s*,?\s*)?(?:\{\s*([^}]+)\s*\})?(?:\*\s+as\s+(\w+))?)\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const defaultImport = match[1];
      const namedImports = match[2];
      const namespaceImport = match[3];
      const source = match[4];

      const symbols: string[] = [];
      let isDefault = false;
      let isNamespace = false;

      if (defaultImport) {
        isDefault = true;
        symbols.push(defaultImport);
      }
      if (namedImports) {
        const names = namedImports.split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
        symbols.push(...names.filter(Boolean));
      }
      if (namespaceImport) {
        isNamespace = true;
        symbols.push(namespaceImport);
      }

      result.imports.push({
        source,
        symbols,
        isDefault,
        isNamespace,
        line: 0,
      });
    }

    // Extract exports (basic)
    const exportRegex = /export\s+(?:default\s+)?(?:function|const|let|var|class|type|interface|enum)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      result.exports.push(match[1]);
    }

    return result;
  }
}

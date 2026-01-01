import { parse, AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { SkeletonExtractor } from './index.js';

/**
 * TypeScript implementation of SkeletonExtractor.
 * Removes function bodies and class method bodies to produce a compact "skeleton"
 * of the code containing only signatures, types, and interfaces.
 */
export class TypeScriptSkeletonExtractor implements SkeletonExtractor {
  extractSkeleton(code: string): string {
    if (!code.trim()) return code;

    try {
      const ast = parse(code, {
        loc: true,
        range: true,
        comment: true,
        tokens: true,
        jsx: true, // Enable JSX parsing just in case
        allowInvalidAST: true,
      });

      const replacements: { start: number; end: number; text: string }[] = [];

      this.walk(ast, (node) => {
        // Handle Functions (Declarations, Expressions, Arrows)
        if (
          node.type === AST_NODE_TYPES.FunctionDeclaration ||
          node.type === AST_NODE_TYPES.FunctionExpression ||
          node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          node.type === AST_NODE_TYPES.MethodDefinition
        ) {
          // For MethodDefinition, we want to skeletonize the 'value' (which is a FunctionExpression)
          const target = node.type === AST_NODE_TYPES.MethodDefinition ? node.value : node;

          if (target.body && target.body.type === AST_NODE_TYPES.BlockStatement) {
            replacements.push({
              start: target.body.range[0],
              end: target.body.range[1],
              text: '{}'
            });
          }
        }
      });

      // Apply replacements from end to start
      replacements.sort((a, b) => b.start - a.start);

      let result = code;
      for (const r of replacements) {
        result = result.substring(0, r.start) + r.text + result.substring(r.end);
      }
      return result;

    } catch (error) {
      // In case of parsing error, return original code to avoid breaking the pipeline
      // but maybe log it if we had a logger.
      return code;
    }
  }

  private walk(node: TSESTree.Node, callback: (node: TSESTree.Node) => void) {
    if (!node) return;
    callback(node);

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in (item as object)) {
            this.walk(item as TSESTree.Node, callback);
          }
        }
      } else if (child && typeof child === 'object' && 'type' in (child as object)) {
        this.walk(child as TSESTree.Node, callback);
      }
    }
  }
}

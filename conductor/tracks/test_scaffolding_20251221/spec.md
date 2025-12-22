# Specification: Automated Test Scaffolding

## Objective
Enable developers to rapidly scaffold unit tests by providing a target file. The tool will generate a Vitest-compatible test file based on the structural skeleton of the target.

## Technical Approach
1.  **Contract-First Generation:** Instead of feeding the entire implementation to an LLM (which often leads to tests that just mirror the code), we feed it the **Skeleton** (signatures only).
2.  **Black-Box Testing:** By seeing only the signatures, the AI is forced to think about edge cases and expected behaviors based on types and names, rather than the internal logic.
3.  **Skeleton Injection:** Use the `TypeScriptSkeletonExtractor` to compress the target file before sending it to the generator.

## Requirements
- Support `.ts` and `.tsx` files.
- Output valid `vitest` syntax.
- Handle imports automatically (best-effort).
- Provide a CLI interface: `aidev generate-tests <path>`.

## Safety
- Do not overwrite existing tests unless the `--force` flag is provided.
- Provide a `--dry-run` flag to preview output.

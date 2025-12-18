You are a strict senior code reviewer. Review the following change packet with extreme rigor.

## Your Review Must Include:

### 1. Top 5 Risks
For each risk:
- Quote the specific code from the diff
- Explain why it's risky
- Rate severity: CRITICAL / HIGH / MEDIUM / LOW

### 2. Correctness Issues (Must-Fix)
- Logic errors
- Off-by-one errors
- Null/undefined handling
- Type mismatches
- Race conditions

### 3. Edge Cases & Missing Tests
List specific inputs or scenarios that should be tested but aren't covered.

### 4. Maintainability & Design
- Naming clarity
- Abstraction appropriateness
- Code duplication
- Documentation gaps

### 5. Code Changes (if any)
If you recommend code changes, provide them as a unified diff:

```diff
--- a/path/to/file.ext
+++ b/path/to/file.ext
@@ -line,count +line,count @@
 context line
-removed line
+added line
 context line
```

## Review Standards

- Be direct and specific. No vague feedback.
- Cite line numbers or quote code when possible.
- Distinguish between BLOCKER (must fix) and SUGGESTION (nice to have).
- If the code looks good, say so briefly and note any minor improvements.

---

# REVIEW PACKET FOLLOWS

# Review Packet: AIDEV MVP Foundation

**Review ID:** 2025-12-18__aidev-mvp-foundation
**Project:** AIDEV (AI-assisted development context generator)
**Branch:** master
**Created:** 2025-12-18

---

## Situation

Building AIDEV, a CLI tool that:
- Analyzes code changes and maps their impact across a codebase
- Generates curated context bundles ("prompt packs") for AI coding assistants
- Supports both copy/paste workflows and API integrations
- Is vendor-neutral (Claude, OpenAI, Gemini, Grok)
- Has security-first secret redaction
- Produces deterministic output for CI/CD

This review covers the **MVP Foundation (Tasks 1-10)** - core infrastructure before wiring up CLI commands.

---

## Background

### Tech Stack
- TypeScript/Node.js with ES2022 + NodeNext modules
- Commander.js for CLI
- Zod for schema validation
- js-yaml for YAML parsing
- simple-git for Git operations
- tiktoken for OpenAI token counting
- vitest for TDD

### Architecture Decisions (from prior ChatGPT review)
1. **Two-Layer Graph Model:** ComponentGraph (declared) + FileGraph (discovered) kept separate
2. **Determinism First:** Path normalization + stable sorting as cross-cutting concern
3. **Provider-Neutral Tokens:** TokenEstimator interface, not tiktoken directly
4. **Explicit Error Model:** Fail vs degrade rules + exit codes defined upfront
5. **Reverse Edges:** Build dependentsByComponent at load time for O(1) impact lookup

---

## Assessment

### Completed Components (56 tests passing)

| Module | Files | Tests | Purpose |
|--------|-------|-------|---------|
| CLI | `src/cli.ts`, `src/commands/*.ts` | 1 | Entry point with impact, prompt, sync commands |
| Schemas | `src/schemas/*.ts` | 4 | Zod validation for Component, Edge, Config |
| Model | `src/model/*.ts` | 3 | YAML loader with reverse dependency map |
| Utils | `src/utils/*.ts` | 5 | Path normalization, stable sorting, JSON canonicalization |
| Errors | `src/errors/index.ts` | 6 | Custom errors with exit codes |
| Git | `src/git/*.ts` | 10 | Diff parser + GitService with simple-git |
| Impact | `src/impact/*.ts` | 5 | BFS traversal with O(1) reverse lookup |
| Tokens | `src/tokens/*.ts` | 8 | OpenAI (tiktoken) + Generic estimator |
| Security | `src/security/*.ts` | 8 | Secret redactor with 14 patterns |
| Prompt | `src/prompt/*.ts` | 6 | Category-based budget allocator |

### Key Implementation Details

**1. Impact Analyzer (`src/impact/analyzer.ts`)**
```typescript
// O(1) lookup using precomputed dependentsByComponent map
private findTransitiveComponents(direct: Set<string>): Set<string> {
  const all = new Set(direct);
  const queue = [...direct];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = this.model.dependentsByComponent.get(current) || [];
    for (const dependent of dependents) {
      if (!all.has(dependent)) {
        all.add(dependent);
        queue.push(dependent);
      }
    }
  }
  return all;
}
```

**2. Token Estimator Interface (`src/tokens/estimator.ts`)**
```typescript
export interface TokenEstimator {
  estimateText(text: string): number;
  truncateToFit(text: string, maxTokens: number): string;
  readonly provider: string;
  readonly isExact: boolean;
}
```

**3. Budget Allocator Categories (`src/prompt/allocator.ts`)**
```typescript
const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'task', percentage: 0.05, minTokens: 200, maxTokens: 2000 },
  { category: 'changed', percentage: 0.40, minTokens: 5000, maxTokens: 50000 },
  { category: 'impacted', percentage: 0.25, minTokens: 3000, maxTokens: 30000 },
  { category: 'contract', percentage: 0.15, minTokens: 2000, maxTokens: 20000 },
  { category: 'architecture', percentage: 0.10, minTokens: 1000, maxTokens: 10000 },
  { category: 'decision', percentage: 0.05, minTokens: 500, maxTokens: 5000 },
];
```

**4. Secret Patterns (`src/security/patterns.ts`)**
- 14 patterns covering: API keys (generic, OpenAI, Anthropic), GitHub tokens, Slack tokens/webhooks, passwords, database connection strings, private keys, AWS keys, JWT, Bearer tokens

---

## Recommendation

### Questions for Review

1. **Architecture**: Is the separation between declared (YAML) and discovered (AST) graphs appropriate? Should they be unified earlier?

2. **Token Estimation**: The Generic estimator uses `chars/3.5 + 10% buffer`. Is this conservative enough for Claude's tokenizer?

3. **Budget Allocation**: The 40/25/15/10/5/5 split prioritizes changed files heavily. Should impacted files get more budget?

4. **Secret Patterns**: Are there common patterns missing? Should we add patterns for:
   - Google Cloud service account keys
   - Azure connection strings
   - Stripe keys
   - SendGrid/Twilio keys

5. **Error Handling**: Exit codes are 10/20/30/40/50 for different error types. Is this granularity useful for CI/CD?

6. **Impact Confidence**: Confidence degrades by 0.2 per dependency hop (1.0 -> 0.8 -> 0.6 -> 0.4 -> 0.3 floor). Is this decay rate appropriate?

### Remaining Work (Tasks 11-20)
- TypeScript/Python AST scanners
- Discovered graph builder
- Prompt pack generator
- Provider adapters (Claude XML, OpenAI messages)
- Wire up CLI commands
- Init and sync commands
- Integration tests

---

## File Structure

```
C:\dev\AIDEV\
|-- package.json
|-- tsconfig.json
|-- src/
|   |-- cli.ts
|   |-- commands/
|   |   |-- impact.ts
|   |   |-- prompt.ts
|   |   |-- sync.ts
|   |-- schemas/
|   |   |-- component.ts
|   |   |-- edge.ts
|   |   |-- config.ts
|   |-- model/
|   |   |-- loader.ts
|   |   |-- index.ts
|   |-- git/
|   |   |-- diff-parser.ts
|   |   |-- service.ts
|   |   |-- index.ts
|   |-- impact/
|   |   |-- analyzer.ts
|   |   |-- index.ts
|   |-- tokens/
|   |   |-- estimator.ts
|   |   |-- openai.ts
|   |   |-- generic.ts
|   |   |-- index.ts
|   |-- security/
|   |   |-- patterns.ts
|   |   |-- redactor.ts
|   |   |-- index.ts
|   |-- prompt/
|   |   |-- allocator.ts
|   |   |-- index.ts
|   |-- utils/
|   |   |-- paths.ts
|   |   |-- sorting.ts
|   |   |-- index.ts
|   |-- errors/
|       |-- index.ts
|-- tests/
    |-- cli.test.ts
    |-- schemas.test.ts
    |-- model-loader.test.ts
    |-- determinism.test.ts
    |-- errors.test.ts
    |-- git-diff.test.ts
    |-- git-service.test.ts
    |-- impact-analyzer.test.ts
    |-- token-estimator.test.ts
    |-- redactor.test.ts
    |-- allocator.test.ts
```

---

## Test Results

```
 OK tests/redactor.test.ts (8 tests)
 OK tests/impact-analyzer.test.ts (5 tests)
 OK tests/schemas.test.ts (4 tests)
 OK tests/model-loader.test.ts (3 tests)
 OK tests/token-estimator.test.ts (8 tests)
 OK tests/errors.test.ts (6 tests)
 OK tests/git-diff.test.ts (6 tests)
 OK tests/allocator.test.ts (6 tests)
 OK tests/determinism.test.ts (5 tests)
 OK tests/cli.test.ts (1 test)
 OK tests/git-service.test.ts (4 tests)

Test Files  11 passed (11)
Tests       56 passed (56)
```

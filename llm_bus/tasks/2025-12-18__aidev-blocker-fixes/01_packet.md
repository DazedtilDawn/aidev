# Review Packet: AIDEV Blocker Fixes

**Review ID:** 2025-12-18__aidev-blocker-fixes
**Project:** AIDEV (AI-assisted development context generator)
**Branch:** master
**Created:** 2025-12-18

---

## Situation

Following a prior code review that identified 3 BLOCKERS in the AIDEV MVP foundation, these fixes have been implemented:

1. **BFS Performance + Determinism** - Impact analyzer used O(n) `shift()` and leaked nondeterminism via Set insertion order
2. **Budget Allocation Validation** - No defined behavior for undersized budgets (totalBudget < sum of minTokens = 11,700)
3. **TokenEstimator Postconditions** - `truncateToFit()` had no failure channel and could silently exceed budget

---

## Background

### Prior Review Findings (ChatGPT)

| # | Issue | Severity | Disposition |
|---|-------|----------|-------------|
| 1 | BFS uses `shift()` (O(n)) + Set insertion order leaks nondeterminism | HIGH | BLOCKER |
| 2 | No defined behavior when `totalBudget < sum(minTokens)` (11,700) | CRITICAL | BLOCKER |
| 3 | `truncateToFit()` has no failure channel, can silently exceed budget | HIGH | BLOCKER |

### Test Results Before/After

- **Before:** 56 tests passing
- **After:** 74 tests passing (+18 new edge case tests)

---

## Assessment

### Fix 1: Impact Analyzer (BFS Performance + Determinism)

**File:** `src/impact/analyzer.ts`

**Changes:**
1. Replaced `queue.shift()` with index cursor for O(1) dequeue
2. Sort adjacency lists before traversal for deterministic insertion order
3. Sort final `affectedComponents` array before returning

```typescript
// BEFORE
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

// AFTER
private findTransitiveComponents(direct: Set<string>): Set<string> {
  const all = new Set(direct);
  const queue = Array.from(direct).sort(); // Sort for determinism
  let head = 0; // Index cursor instead of shift()

  while (head < queue.length) {
    const current = queue[head]!;
    head += 1;

    const dependents = this.model.dependentsByComponent.get(current) ?? [];
    const orderedDependents = dependents.length <= 1 ? dependents : [...dependents].sort();
    for (const dependent of orderedDependents) {
      if (!all.has(dependent)) {
        all.add(dependent);
        queue.push(dependent);
      }
    }
  }
  return all;
}
```

**New Tests:**
- Cycles in dependency graph (A->B->A)
- Self-loops (A->A)
- Deterministic output regardless of adjacency list order
- Multiple starting nodes

---

### Fix 2: Budget Allocator Validation

**File:** `src/prompt/allocator.ts`

**Changes:**
1. Added `BudgetValidationError` class
2. Validation in constructor for invalid totalBudget
3. Validation for custom budgets (percentages sum to 1, min <= max, no duplicates)
4. Frozen DEFAULT_BUDGETS for immutability
5. Deterministic tie-breaking by path for equal priorities

```typescript
// NEW: Error class
export class BudgetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetValidationError';
  }
}

// NEW: Frozen defaults
const DEFAULT_BUDGETS: readonly CategoryBudget[] = Object.freeze([
  Object.freeze({ category: 'task' as const, percentage: 0.05, minTokens: 200, maxTokens: 2000 }),
  // ... rest frozen
]);

// NEW: Validation function
function validateBudgets(budgets: readonly CategoryBudget[]): void {
  const seen = new Set<string>();
  let pctSum = 0;
  for (const b of budgets) {
    if (seen.has(b.category)) throw new BudgetValidationError(`Duplicate category`);
    if (b.minTokens > b.maxTokens) throw new BudgetValidationError(`min > max`);
    pctSum += b.percentage;
  }
  if (Math.abs(pctSum - 1) > 1e-9) throw new BudgetValidationError(`Percentages must sum to 1`);
}

// NEW: Constructor validation
constructor(totalBudget: number, budgets = DEFAULT_BUDGETS) {
  if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
    throw new BudgetValidationError(`Invalid totalBudget: ${totalBudget}`);
  }
  if (budgets !== DEFAULT_BUDGETS) validateBudgets(budgets);
  // ...
}

// NEW: Deterministic sorting
const sorted = [...categoryItems].sort((a, b) => {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return (a.path ?? '').localeCompare(b.path ?? ''); // Tie-break by path
});
```

**New Tests:**
- Throws for totalBudget = 0 or negative
- Allows small budgets with degraded allocation
- Handles very small budgets (50 tokens) without NaN
- Deterministic with equal priority items
- Throws for invalid custom budgets (percentages, min>max, duplicates)

---

### Fix 3: TokenEstimator Postconditions

**Files:** `src/tokens/estimator.ts`, `src/tokens/openai.ts`, `src/tokens/generic.ts`

**Changes:**
1. Documented postconditions in interface
2. Return `""` for `maxTokens <= 0`
3. OpenAI: Guaranteed postcondition `estimateText(result) <= maxTokens`
4. Generic: Safe unicode handling with `Array.from()`

```typescript
// NEW: Interface documentation
export interface TokenEstimator {
  /**
   * Truncate text to fit within maxTokens.
   *
   * Required behavior:
   * - MUST be deterministic for the same input.
   * - MUST return "" when maxTokens <= 0.
   * - When `isExact === true`, MUST guarantee estimateText(result) <= maxTokens.
   */
  truncateToFit(text: string, maxTokens: number): string;
  // ...
}

// OpenAI: Guaranteed postcondition
truncateToFit(text: string, maxTokens: number): string {
  if (maxTokens <= 0) return '';
  if (!text) return '';
  // ... exact token calculation with marker
  const marker = '\n... [truncated]';
  const markerTokens = this.encoder.encode(marker).length;
  if (markerTokens >= maxTokens) return '';
  const maxContentTokens = maxTokens - markerTokens;
  // ... guarantees postcondition
}

// Generic: Safe unicode
truncateToFit(text: string, maxTokens: number): string {
  if (maxTokens <= 0) return '';
  // ...
  const chars = Array.from(text); // Safe unicode handling
  const truncatedChars = chars.slice(0, Math.min(targetChars, chars.length));
  return truncatedChars.join('') + '\n... [truncated]';
}
```

**New Tests:**
- Returns empty string for maxTokens <= 0
- Guarantees postcondition for exact estimator across boundary values (1, 5, 10, 50, 100)
- Handles empty input gracefully
- Handles unicode and emoji (no split surrogates)
- Deterministic output

---

## Recommendation

### Questions for Review

1. **Performance:** Is the index cursor approach sufficient, or should we use a proper queue data structure for very large graphs?

2. **Validation Timing:** Budget validation happens at construction time. Should we also validate at allocation time for runtime configuration changes?

3. **Unicode Edge Cases:** The generic estimator now uses `Array.from()` for safe unicode slicing. Is there any performance concern for very large texts?

4. **Error Recovery:** Currently validation errors are thrown. Should any be degraded to warnings with fallback behavior for non-CI contexts?

5. **Documentation:** Are the interface postconditions sufficiently clear for implementers of new token estimators?

---

## File Changes

```
src/impact/analyzer.ts    | Modified: BFS performance + determinism
src/prompt/allocator.ts   | Modified: Validation + BudgetValidationError
src/prompt/index.ts       | Modified: Export BudgetValidationError
src/tokens/estimator.ts   | Modified: Documented postconditions
src/tokens/openai.ts      | Modified: Guaranteed postcondition
src/tokens/generic.ts     | Modified: Safe unicode, edge cases
tests/impact-analyzer.test.ts | +4 tests (cycles, self-loops, determinism)
tests/allocator.test.ts   | +8 tests (validation, edge cases)
tests/token-estimator.test.ts | +6 tests (postconditions, unicode)
```

---

## Test Results

```
 OK tests/impact-analyzer.test.ts (9 tests)
 OK tests/redactor.test.ts (8 tests)
 OK tests/allocator.test.ts (14 tests)
 OK tests/model-loader.test.ts (3 tests)
 OK tests/token-estimator.test.ts (14 tests)
 OK tests/git-diff.test.ts (6 tests)
 OK tests/errors.test.ts (6 tests)
 OK tests/schemas.test.ts (4 tests)
 OK tests/determinism.test.ts (5 tests)
 OK tests/cli.test.ts (1 test)
 OK tests/git-service.test.ts (4 tests)

Test Files  11 passed (11)
Tests       74 passed (74)
```

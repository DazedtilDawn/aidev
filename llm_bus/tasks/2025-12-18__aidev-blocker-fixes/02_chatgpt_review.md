# ChatGPT Review: AIDEV Blocker Fixes

**Review Date:** 2025-12-18
**Reviewer:** ChatGPT (GPT-4)
**Verdict:** BLOCKERS FOUND

---

## Summary

| # | Issue | Severity | Disposition |
|---|-------|----------|-------------|
| 1 | `validateBudgets()` never records categories (`seen.add()` missing) | CRITICAL | BLOCKER |
| 2 | Budget validation accepts NaN/Infinity percentages | HIGH | BLOCKER |
| 3 | `localeCompare()` breaks determinism across environments | HIGH | BLOCKER |
| 4 | Generic truncation always appends marker even when no truncation | HIGH | BLOCKER |
| 5 | BFS sorting adjacency lists per node is expensive | MEDIUM | SUGGESTION |

---

## Risk 1 — Budget duplicate validation is broken as written (CRITICAL)

**Code (from `src/prompt/allocator.ts`)**

```ts
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
```

**Issue:** `seen` is **never updated** (`seen.add(b.category)` is missing). Duplicates will never be detected.

---

## Risk 2 — Validation accepts NaN / Infinity (HIGH)

**Issue:** If any `b.percentage` is `NaN`, then `pctSum` becomes `NaN`. `Math.abs(NaN - 1)` is `NaN`, and `NaN > 1e-9` is **false**, so invalid input passes validation.

---

## Risk 3 — Deterministic tie-break uses `localeCompare()` (HIGH)

**Code:**
```ts
return (a.path ?? '').localeCompare(b.path ?? ''); // Tie-break by path
```

**Issue:** `localeCompare()` depends on runtime locale / ICU behavior. In CI, `LANG` / ICU builds can differ between environments.

---

## Risk 4 — Generic truncation marker behavior (HIGH)

**Code (from `src/tokens/generic.ts`)**
```ts
const chars = Array.from(text); // Safe unicode handling
const truncatedChars = chars.slice(0, Math.min(targetChars, chars.length));
return truncatedChars.join('') + '\n... [truncated]';
```

**Issue:** Always appends marker even when no truncation occurred. Also `targetChars` can go negative.

---

## Risk 5 — BFS per-node sorting is expensive (MEDIUM)

**Issue:** Sorting dependents every time you visit a node. Better: sort once when building `dependentsByComponent`.

---

## Recommended Patches

### Patch 1 — Fix `validateBudgets()` (BLOCKER)

```diff
--- a/src/prompt/allocator.ts
+++ b/src/prompt/allocator.ts
 function validateBudgets(budgets: readonly CategoryBudget[]): void {
   const seen = new Set<string>();
   let pctSum = 0;
   for (const b of budgets) {
-    if (seen.has(b.category)) throw new BudgetValidationError(`Duplicate category`);
-    if (b.minTokens > b.maxTokens) throw new BudgetValidationError(`min > max`);
-    pctSum += b.percentage;
+    if (seen.has(b.category)) {
+      throw new BudgetValidationError(`Duplicate category: ${b.category}`);
+    }
+    seen.add(b.category);
+
+    if (!Number.isFinite(b.percentage) || b.percentage < 0 || b.percentage > 1) {
+      throw new BudgetValidationError(`Invalid percentage for ${b.category}: ${b.percentage}`);
+    }
+    if (!Number.isInteger(b.minTokens) || b.minTokens < 0) {
+      throw new BudgetValidationError(`Invalid minTokens for ${b.category}: ${b.minTokens}`);
+    }
+    if (!Number.isInteger(b.maxTokens) || b.maxTokens < 0) {
+      throw new BudgetValidationError(`Invalid maxTokens for ${b.category}: ${b.maxTokens}`);
+    }
+    if (b.minTokens > b.maxTokens) {
+      throw new BudgetValidationError(
+        `minTokens > maxTokens for ${b.category}: ${b.minTokens} > ${b.maxTokens}`
+      );
+    }
+
+    pctSum += b.percentage;
   }
-  if (Math.abs(pctSum - 1) > 1e-9) throw new BudgetValidationError(`Percentages must sum to 1`);
+  if (!Number.isFinite(pctSum)) {
+    throw new BudgetValidationError(`Invalid percentage sum: ${pctSum}`);
+  }
+  if (Math.abs(pctSum - 1) > 1e-9) {
+    throw new BudgetValidationError(`Percentages must sum to 1 (got ${pctSum})`);
+  }
 }
```

### Patch 2 — Remove locale dependence (BLOCKER)

```diff
--- a/src/prompt/allocator.ts
+++ b/src/prompt/allocator.ts
 const sorted = [...categoryItems].sort((a, b) => {
   if (b.priority !== a.priority) return b.priority - a.priority;
-  return (a.path ?? '').localeCompare(b.path ?? ''); // Tie-break by path
+  const ap = a.path ?? '';
+  const bp = b.path ?? '';
+  // Deterministic, locale-independent ordering
+  if (ap < bp) return -1;
+  if (ap > bp) return 1;
+  return 0;
 });
```

### Patch 3 — Make generic truncation marker conditional (BLOCKER)

```diff
--- a/src/tokens/generic.ts
+++ b/src/tokens/generic.ts
 const chars = Array.from(text); // Safe unicode handling
-const truncatedChars = chars.slice(0, Math.min(targetChars, chars.length));
-return truncatedChars.join('') + '\n... [truncated]';
+const safeTarget = Math.max(0, Math.min(targetChars, chars.length));
+const truncatedChars = chars.slice(0, safeTarget);
+const truncated = truncatedChars.join('');
+// Only append a marker when truncation actually occurred
+if (safeTarget < chars.length) {
+  return truncated + '\n... [truncated]';
+}
+return truncated;
```

---

## Questions Answered

1. **BFS Performance:** Index cursor is fine. Standard O(1) dequeue pattern.
2. **Validation Timing:** Constructor-time is enough if you guarantee immutability. Copy + freeze in constructor.
3. **Unicode Perf:** `Array.from()` is expensive. Do fast path check before building char array.
4. **Error Recovery:** Default should be strict. Offer `--lenient` mode for interactive use.
5. **Postconditions:** Still missing explicit guidance for approximate estimators.

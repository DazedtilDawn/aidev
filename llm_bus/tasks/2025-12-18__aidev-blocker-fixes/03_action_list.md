# Action List: AIDEV Blocker Fixes Review

**Created:** 2025-12-18
**Status:** COMPLETED

---

## ChatGPT Review Findings vs Actual Code

| # | ChatGPT Finding | Verdict | Action |
|---|-----------------|---------|--------|
| 1 | `seen.add()` missing in duplicate detection | FALSE POSITIVE | Packet truncation - actual code has it (line 55) |
| 2 | NaN/Infinity percentages not validated | FALSE POSITIVE | Already fixed - `Number.isFinite()` checks on lines 57-65 |
| 3 | `localeCompare()` is locale-dependent | **TRUE** | **FIXED** - Replaced with `<` `>` comparison |
| 4 | Generic truncation always appends marker | FALSE POSITIVE | Early return on line 32 handles this |
| 5 | BFS per-node sorting is expensive | SUGGESTION | Deferred - acceptable for MVP |

---

## Fix Applied

### localeCompare() → Locale-independent comparison

**File:** `src/prompt/allocator.ts:137-145`

```typescript
// BEFORE
return (a.path ?? '').localeCompare(b.path ?? '');

// AFTER
const ap = a.path ?? '';
const bp = b.path ?? '';
if (ap < bp) return -1;
if (ap > bp) return 1;
return 0;
```

---

## Test Results

```
Test Files  11 passed (11)
Tests       74 passed (74)
```

---

## Conclusion

The ChatGPT review was thorough but the packet snippets were truncated, leading to 3 false positives. The one real issue (locale-dependent sorting) has been fixed.

**All blockers from both review rounds are now resolved.**

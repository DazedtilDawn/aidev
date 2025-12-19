# Action List

**Review ID:** 2025-12-19__aidev-vision-gap-review
**Generated:** 2025-12-19

---

## BLOCKERS (must fix)

### COR-1: --min-confidence parsing too weak
**File:** `src/commands/impact.ts`
**Issue:** `parseInt()` without validation - invalid inputs silently produce surprising behavior
**Fix:** Use Commander's custom option processing with `InvalidArgumentError`

- [x] Fixed
- [x] Verified (invalid values like "150" and "abc" now produce clear error messages)

### COR-2: Filter semantics undefined with multiple edges
**File:** `src/commands/impact.ts`
**Issue:** Uses `find()` which returns first match, not strongest edge
**Fix:** Build `bestByTarget` map, ensure changed files always retained

- [x] Fixed
- [x] Verified (uses best-edge-per-target, changed files always retained)

---

## IMPORTANT (should fix)

### COR-3: "Confidence" is misleading terminology
**Issue:** Distance-decay heuristic presented as probability
**Fix:** Document clearly that it's a ranking score, not a probability
**Deferred:** Rename to `impactScore` is larger change - defer to Phase 0

- [ ] Acknowledged

---

## NICE-TO-HAVE (defer)

### ARCH-1: Evidence Graph IR
**Status:** Deferred to Phase 1

### ARCH-2: Component-level default output
**Status:** Deferred to Phase 0

### INNOV-1: Contract detection (OpenAPI)
**Status:** Deferred to Phase 2

---

## Suggested Patch (from ChatGPT)

```typescript
import { Command, InvalidArgumentError } from 'commander';

interface ImpactOptions {
  diff?: string;
  staged?: boolean;
  file?: string;
  json?: boolean;
  minConfidence?: number; // percent 0-100
}

function parsePercent(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new InvalidArgumentError(`--min-confidence must be a number from 0 to 100 (got "${value}")`);
  }
  return n;
}

// In command definition:
.option('--min-confidence <percent>', 'Filter impacts below confidence threshold (0-100)', parsePercent, 0)

// In action handler:
const minConfidence = (options.minConfidence ?? 0) / 100;
if (minConfidence > 0) {
  const changedPaths = new Set(changedFiles.map(f => f.path));
  const bestByTarget = new Map<string, number>();
  for (const e of report.fileImpactEdges) {
    const prev = bestByTarget.get(e.target) ?? 0;
    if (e.confidence > prev) bestByTarget.set(e.target, e.confidence);
  }

  const filteredFileEdges = report.fileImpactEdges.filter(e => e.confidence >= minConfidence);
  const filteredFiles = report.affectedFiles.filter(f =>
    changedPaths.has(f) || (bestByTarget.get(f) ?? 0) >= minConfidence
  );
  // ... rest of filtering
}
```

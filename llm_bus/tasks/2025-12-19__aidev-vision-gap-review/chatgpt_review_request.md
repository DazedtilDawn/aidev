You are a senior technical architect and research advisor. Review the following change packet with a **conceptual and strategic focus**.

## Your Review Focus

You are NOT doing a line-by-line code review. Instead, focus on higher-level concerns.

**IMPORTANT CARVE-OUT:** You MAY cite a minimal code snippet (1-5 lines) when necessary to justify an architectural concern, deprecated API usage, or design-level issue. The goal is strategic insight, not implementation nitpicking.

---

### 1. Documentation & Best Practices Currency
- Are we using **latest patterns and APIs** for the technologies involved?
- Are there **deprecated approaches** that should be updated?
- Do our dependencies have newer, better alternatives?
- Are we following **current best practices** from official documentation?

**If you claim something is deprecated or superseded, cite the official doc/release note or mark as [UNCERTAIN].**

### 2. Architectural & Design Logic
- Is the **overall approach sound**? Are there better architectural patterns?
- Does the **logic flow** make sense? Any fundamental flaws in reasoning?
- Are there **industry-standard solutions** we're reinventing?
- Is the **abstraction level** appropriate (too complex? too simple?)

### 3. Innovation & Alternatives
- Are there **more elegant or efficient methods** to achieve the same goal?
- What do **other successful projects** do in similar situations?
- Are there **emerging patterns or tools** we should consider?
- Could **AI/ML, caching, or other techniques** improve this?

### 4. Correctness of Approach
- Is the **fundamental algorithm/strategy** correct?
- Are there **edge cases in the design** (not just implementation)?
- Does this **scale** appropriately for expected use cases?
- Are there **security implications** at the design level?

### 5. Requirements & Intent Alignment (NEW)
- Does the implementation **match the stated goals/constraints**?
- Are there **backward compatibility or migration concerns**?
- Does this solve the **right problem** (not just a problem)?
- Are there **unstated assumptions** that should be explicit?

### 6. Operability & Production Readiness (NEW)
- Is there adequate **logging, metrics, and tracing**?
- How does this affect **rollout/rollback** capability?
- Are there **cost implications** (compute, storage, API calls)?
- Does this consider **failure modes and recovery**?

---

## What NOT to Focus On

Leave these to the code reviewer (Codex):
- Specific line-by-line bugs (unless they evidence an architectural flaw)
- Syntax or formatting issues
- Variable naming minutiae
- Detailed test coverage analysis

---

## Severity Rubric (Unified)

| Severity | Criteria |
|----------|----------|
| **CRITICAL** | Must fix before merge: architectural flaw, security boundary breach, fundamentally wrong approach |
| **HIGH** | Likely production incident, major maintainability regression, or significantly outdated pattern |
| **MEDIUM** | Important strategic improvement; can merge with follow-up |
| **LOW** | Polish, optimization opportunity, future consideration |

---

## Output Format

For each finding, provide a JSON block followed by explanation:

```json
{
  "schema_version": "1.0",
  "reviewer": "chatgpt",
  "review_id": "<from-packet>",
  "id": "ARCH-1",
  "severity": "HIGH",
  "domain": "architecture|documentation|innovation|requirements|operability|correctness|security",
  "locations": [],
  "summary": "Brief description",
  "evidence": "Minimal code snippet or observation (if needed)",
  "recommendation": "Alternative approach with rationale",
  "references": ["URL to docs or examples if available"],
  "confidence": 0.85
}
```

**Unified domain taxonomy** (shared with Codex):
- `architecture` - Design patterns, system structure
- `documentation` - API currency, deprecated patterns
- `innovation` - Better alternatives, emerging tools
- `requirements` - Intent alignment, scope fit
- `operability` - Logging, metrics, failure modes
- `correctness` - Algorithm/strategy correctness
- `security` - Design-level security concerns

**Note:** `locations` is optional for conceptual findings; include file references when citing specific code. Codex adds `code_dimension` for implementation-specific classification.

Then provide human-readable explanation, context, and trade-offs.

---

## Examples

### Example 1: Conceptual Blocker (CRITICAL)

```json
{
  "schema_version": "1.0",
  "reviewer": "chatgpt",
  "review_id": "2025-01-15__feature-queue",
  "id": "ARCH-1",
  "severity": "CRITICAL",
  "domain": "architecture",
  "locations": [{"file": "src/queue/processor.ts", "line_start": 45, "line_end": 60}],
  "summary": "Synchronous processing model won't scale for expected load",
  "evidence": "The processQueue() function handles items sequentially",
  "recommendation": "Consider event-driven architecture with worker pool or message queue",
  "references": ["https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html"],
  "confidence": 0.90
}
```

The current design processes queue items synchronously in a single thread. Given the stated requirement of 10K events/second, this will bottleneck at ~100 events/second. An event-driven model with horizontal scaling would be more appropriate.

### Example 2: Innovation Suggestion (MEDIUM)

```json
{
  "schema_version": "1.0",
  "reviewer": "chatgpt",
  "review_id": "2025-01-15__feature-queue",
  "id": "INNOV-1",
  "severity": "MEDIUM",
  "domain": "innovation",
  "locations": [],
  "summary": "Token counting could use official Anthropic tokenizer",
  "evidence": "Generic estimator uses chars/3.5 heuristic",
  "recommendation": "Consider @anthropic-ai/tokenizer for exact Claude token counts",
  "references": ["https://github.com/anthropics/anthropic-tokenizer-typescript"],
  "confidence": 0.70
}
```

While the generic estimator is conservative and safe, Anthropic now provides an official tokenizer package that would give exact counts for Claude models, improving budget utilization by ~10-15%.

---

## Review Standards

- Think strategically, not tactically
- Reference official docs, well-known patterns, or industry standards
- Distinguish between BLOCKER (architectural flaw) and SUGGESTION (optimization opportunity)
- If the approach is solid, say so briefly and highlight any minor strategic improvements
- When uncertain, say so explicitly rather than guessing

---

# REVIEW PACKET FOLLOWS

# AIDEV Code Review Packet

## Meta
- **Date**: 2025-12-19
- **Branch**: master
- **Last Commit**: cebd381e - feat(impact): add --min-confidence flag
- **Tests**: 191/191 passing
- **Scope**: Full project architecture review + recent feature

## Context

This review follows a critical self-assessment: AIDEV was built to ~25% of the original vision. The tool was designed to be an "intelligent impact analyzer with evidence trails" but is currently a "context bundler with basic dependency graphs."

### Original Vision (Key Requirements)
1. **Impact Report with Evidence Trails** - Show WHY files are affected, not just THAT they are
2. **9 Edge Types**: import, call, type_reference, extends, uses_table, publishes_event, calls_endpoint, reads_config, test_covers
3. **Contract Detection**: OpenAPI specs, AsyncAPI, SQL migrations, GraphQL schemas
4. **ADR Integration**: Link architectural decisions to affected code
5. **Safe-Share Mode**: Full content redaction for team sharing
6. **Plugin Architecture**: Custom scanners for new languages/patterns
7. **Observability**: explain, doctor, debug-bundle commands

### Current Reality
- Basic import/call edge detection only
- No evidence trails in output
- No contract detection
- No ADR support
- Pattern-based secret redaction (works well)
- Token budgeting (works but may be obsolete with larger context windows)

## Review Focus

Please evaluate:
1. **Architecture Foundation**: Is the current structure extensible toward the vision?
2. **Value Delivered**: What's actually useful vs what's noise?
3. **Pivot or Persist**: Should this continue toward the vision, or pivot to something simpler?

---

## Recent Change: --min-confidence Flag

### Diff (src/commands/impact.ts)
```diff
interface ImpactOptions {
   diff?: string;
   staged?: boolean;
   file?: string;
   json?: boolean;
+  minConfidence?: string;
 }

 export const impactCommand = new Command('impact')
@@ -19,6 +20,7 @@ export const impactCommand = new Command('impact')
   .option('--staged', 'Analyze staged changes')
   .option('--file <path>', 'Analyze specific file')
   .option('--json', 'Output as JSON')
+  .option('--min-confidence <percent>', 'Filter impacts below confidence threshold (0-100)', '0')
   .action(async (options: ImpactOptions) => {
     // ... existing code ...

       // Analyze impact
       const analyzer = new ImpactAnalyzer(model);
-      const report = analyzer.analyze(changedFiles);
+      let report = analyzer.analyze(changedFiles);
+
+      // Apply confidence filter
+      const minConfidence = parseInt(options.minConfidence || '0', 10) / 100;
+      if (minConfidence > 0) {
+        const filteredFileEdges = report.fileImpactEdges.filter(e => e.confidence >= minConfidence);
+        const filteredFiles = report.affectedFiles.filter(f => {
+          const edge = report.fileImpactEdges.find(e => e.target === f);
+          return !edge || edge.confidence >= minConfidence;
+        });
+        const filteredImpactEdges = report.impactEdges.filter(e => e.confidence >= minConfidence);
+
+        report = {
+          ...report,
+          affectedFiles: filteredFiles,
+          fileImpactEdges: filteredFileEdges,
+          impactEdges: filteredImpactEdges,
+          summary: {
+            ...report.summary,
+            filesAffected: filteredFiles.length,
+          },
+        };
+      }
```

---

## Key Files for Review

### 1. Impact Analyzer (src/impact/analyzer.ts)
Core BFS traversal for dependency impact. Currently only tracks component-level and file-level import edges.

### 2. Secret Redactor (src/security/patterns.ts)
25+ patterns for API keys, tokens, passwords. This is the most mature/valuable part.

### 3. Prompt Generator (src/prompt/generator.ts)
Token budgeting and context assembly. Works but may be solving yesterday's problem.

### 4. Graph Builder (src/graph/builder.ts)
Builds edges from AST scan results. Only tracks imports currently.

---

## Questions for Reviewers

1. **Is the confidence scoring model (distance-based decay) sound?** Or is it just adding false precision to imprecise data?

2. **Should file-level impact tracking be removed?** It produces 45+ files for a 1-file change. Is this useful or just noise?

3. **What's the minimum viable evidence trail?** The vision wanted full provenance. What's the smallest useful version?

4. **Token budgeting with 200k+ context windows** - Is this solving a real problem anymore?

5. **Architecture pivot**: Would a simpler tool that ONLY does secret redaction + file bundling be more valuable than the full impact analysis?

---

## Acceptance Criteria for This Review

- [ ] Assessment of architecture extensibility
- [ ] Identification of code quality issues in recent change
- [ ] Strategic recommendation: pivot, persist, or abandon
- [ ] Specific next steps if continuing

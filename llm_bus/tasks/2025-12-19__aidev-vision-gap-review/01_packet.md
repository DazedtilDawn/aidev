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

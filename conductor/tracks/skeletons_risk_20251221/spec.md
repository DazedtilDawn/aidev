# Track Specification: Advanced Dependency Skeletons & Risk Analysis

## Outcome
A specialized pipeline that generates high-density context packets containing full code for *changed* files but only **semantic skeletons** for *impacted* dependencies, plus a calculated risk graph.

## Definition of Done
* `ImpactAnalyzer` computes "Risk" (High/Medium/Low) for each edge/node.
* New `SkeletonScanner` (or extension to existing scanners) extracts signatures only.
* New `UniversalFormatter` (or update to `ClaudeFormatter`) outputs the specific XML structure:
    ```xml
    <dependency_context>
      <file path="..." type="skeleton">...</file>
    </dependency_context>
    <impact_graph>
       generic.ts -> estimator.ts (Confidence: 0.95)
       index.ts -> allocator.ts (Risk: High)
    </impact_graph>
    ```
* CLI supports `--skeleton` flag to enable this mode.

## Detailed Requirements

### 1. Skeleton Extraction
- **Input:** Full file content (TS/JS/Python).
- **Output:** Valid syntax (so LLMs understand it) but with bodies removed.
- **Example TS:** `export function foo(a: string): number { ... }` becomes `export function foo(a: string): number;` or `export function foo(a: string): number { /* implementation hidden */ }`

### 2. Risk Scoring
- **High Risk:** 
    - Files with > 5 incoming dependencies (High Fan-in).
    - Files listed in `contracts` in component definition.
- **Low Risk:**
    - Leaf nodes (no dependents).
    - Test files.

### 3. Integration
- `aidev prompt --skeleton` should use the Skeleton extraction for *impacted* files, but keep full content for *changed* (primary) files.

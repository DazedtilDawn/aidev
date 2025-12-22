# Track Plan: Advanced Dependency Skeletons & Risk Analysis

## Phase 1: Skeleton Extraction Logic [checkpoint: 4d0c109]
- [x] Task: Create `SkeletonExtractor` interface and TypeScript implementation (`src/scanners/skeletons/typescript.ts`). e1a5f31
- [x] Task: Implement regex or AST-based stripping of function bodies and class methods. e1a5f31
- [x] Task: Add unit tests verifying that valid TS signatures are preserved while logic is removed. e1a5f31
- [x] Task: Conductor - User Manual Verification 'Skeleton Extraction Logic' (Protocol in workflow.md) 4d0c109

## Phase 2: Risk Analysis Engine
- [ ] Task: Update `ImpactAnalyzer` to calculate `fanIn` for each node in the graph.
- [ ] Task: Implement `calculateRisk(file, dependencies)` logic (High/Medium/Low).
- [ ] Task: Update `ImpactReport` to include `risk` metadata for each affected file.
- [ ] Task: Conductor - User Manual Verification 'Risk Analysis Engine' (Protocol in workflow.md)

## Phase 3: Universal Packet Formatter [checkpoint: f6d4f25]
- [x] Task: Create `UniversalFormatter` in `src/prompt/formatters/universal.ts`. a4c205f
- [x] Task: Implement the XML structure with `<skeleton>` tags and `<impact_graph>`. a4c205f
- [x] Task: Wire up the `PromptPackGenerator` to use `SkeletonExtractor` for impacted files when a flag is set. fb129cd
- [x] Task: Conductor - User Manual Verification 'Universal Packet Formatter' (Protocol in workflow.md) f6d4f25

## Phase 4: CLI & Integration
- [ ] Task: Add `--skeleton` flag to `aidev prompt`.
- [ ] Task: Add integration tests ensuring the `--skeleton` flag produces reduced token counts compared to full output.
- [ ] Task: Conductor - User Manual Verification 'CLI & Integration' (Protocol in workflow.md)

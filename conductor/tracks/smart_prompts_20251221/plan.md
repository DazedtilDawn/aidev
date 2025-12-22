# Track Plan: Smart Prompt Templates & Presets

## Phase 1: Preset Architecture (plumbing) [checkpoint: 1dbd7a8]
- [x] Task: Define the template schema (frontmatter + body) and `Preset` interface in `src/prompt/presets/types.ts`. [2a8d3f5]
- [x] Task: Create `PresetResolver` in `src/prompt/presets/resolver.ts` to handle built-ins and local loading. [5813074]
- [x] Task: Implement variable interpolation logic (handle missing vars with actionable errors). [d960728]
- [x] Task: Update `PromptPackGenerator` to accept a resolved `Preset` and inject its content into the bundle. [121acbc]
- [x] Task: Conductor - User Manual Verification 'Preset Architecture' (Protocol in workflow.md) [1dbd7a8]

## Phase 2: Template Library (intelligence) [checkpoint: 8677ecb]
- [x] Task: Author the `bugfix` template with robust system instructions and workflow steps. [95d5267]
- [x] Task: Author the `feature` template focusing on implementation planning and completeness. [95d5267]
- [x] Task: Author the `refactor` template focusing on safety and non-functional improvements. [95d5267]
- [x] Task: Author the `test` template focusing on coverage and edge cases. [95d5267]
- [x] Task: Conductor - User Manual Verification 'Template Library' (Protocol in workflow.md) [8677ecb]

## Phase 3: Active Context Summarization
- [x] Task: Update `ImpactAnalyzer` to generate a "relationship summary" string for each impacted file (e.g., "Imports changed file X"). [04ffca3]
- [ ] Task: Update `ContextBundle` to include these summaries.
- [ ] Task: Update `ClaudeFormatter` and `OpenAIFormatter` to display the "Context Rationale" in the generated prompt.
- [ ] Task: Conductor - User Manual Verification 'Active Context Summarization' (Protocol in workflow.md)

## Phase 4: QA + Docs + Release
- [ ] Task: Add integration tests for `aidev prompt --preset <name>`.
- [ ] Task: Update `aidev prompt` CLI command to support `--preset`, `--list-presets`, etc.
- [ ] Task: Add documentation for creating custom presets.
- [ ] Task: Final verification: generate prompts for AIDEV itself using the new presets.
- [ ] Task: Conductor - User Manual Verification 'QA + Docs + Release' (Protocol in workflow.md)

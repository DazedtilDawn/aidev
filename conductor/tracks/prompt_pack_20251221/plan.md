# Track Plan: Prompt Pack Generator

## Phase 1: Core Architecture & Interfaces [checkpoint: 9be97d9]
- [x] Task: Define the `PromptFormatter` interface and base types in `src/prompt/types.ts`. [669919c]
- [x] Task: Create the `PromptGenerator` class in `src/prompt/generator.ts` (refactor existing if needed) to orchestrate the formatting process. [1af61de]
- [x] Task: Implement a mock/test formatter to verify the pipeline. [1af61de]
- [x] Task: Conductor - User Manual Verification 'Core Architecture & Interfaces' (Protocol in workflow.md) [9be97d9]

## Phase 2: Provider Formatters [checkpoint: 137296a]
- [x] Task: Implement `ClaudeFormatter` in `src/prompt/formatters/claude.ts` (XML structure). [a07443e]
- [x] Task: Write unit tests for `ClaudeFormatter` to ensure correct XML tagging and escaping. [a07443e]
- [x] Task: Implement `OpenAIFormatter` in `src/prompt/formatters/openai.ts` (JSON/Message structure). [8db5d0c]
- [x] Task: Write unit tests for `OpenAIFormatter` to ensure correct JSON structure and content placement. [8db5d0c]
- [x] Task: Conductor - User Manual Verification 'Provider Formatters' (Protocol in workflow.md) [137296a]

## Phase 3: CLI Integration & Wiring
- [ ] Task: Update `src/commands/prompt.ts` to wire up the `PromptGenerator` with the `ImpactAnalyzer` and `SecretRedactor`.
- [ ] Task: Implement the CLI flags: `--provider`, `--budget`, `--format`, and output handling.
- [ ] Task: Add integration tests ensuring `aidev prompt` produces valid output for a sample codebase.
- [ ] Task: Conductor - User Manual Verification 'CLI Integration & Wiring' (Protocol in workflow.md)

## Phase 4: Documentation & Polish
- [ ] Task: Update `README.md` with usage examples for the new `prompt` command.
- [ ] Task: Add JSDoc comments to public interfaces in the `prompt` module.
- [ ] Task: Final verification run: generate prompt packs for the AIDEV codebase itself and verify content.
- [ ] Task: Conductor - User Manual Verification 'Documentation & Polish' (Protocol in workflow.md)

# Track Plan: Automated Test Scaffolding

## Phase 1: Test Generation Engine
- [ ] Task: Create `TestGenerator` in `src/prompt/test-generator.ts`.
- [ ] Task: Implement a specific "test-gen" prompt preset that accepts a skeleton and requests Vitest cases.
- [ ] Task: Integrate `TypeScriptSkeletonExtractor` to ensure the generator only sees the contract.
- [ ] Task: Conductor - User Manual Verification 'Test Generation Engine' (Protocol in workflow.md)

## Phase 2: CLI Command
- [ ] Task: Add `generate-tests` command to `src/cli.ts`.
- [ ] Task: Implement file discovery and path resolution for the target file.
- [ ] Task: Add `--output` and `--force` flags to control where tests are written.
- [ ] Task: Conductor - User Manual Verification 'CLI Command' (Protocol in workflow.md)

## Phase 3: Integration & Validation
- [ ] Task: Implement a "Dry Run" mode that prints the test code without writing to disk.
- [ ] Task: Add integration tests that verify a generated test file can actually be run by Vitest.
- [ ] Task: Conductor - User Manual Verification 'Integration & Validation' (Protocol in workflow.md)

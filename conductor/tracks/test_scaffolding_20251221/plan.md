# Track Plan: Automated Test Scaffolding

## Phase 1: Test Generation Engine [checkpoint: 468354e]
- [x] Task: Create `TestGenerator` in `src/prompt/test-generator.ts`. 602fb45
- [x] Task: Implement a specific "test-gen" prompt preset that accepts a skeleton and requests Vitest cases. 602fb45
- [x] Task: Integrate `TypeScriptSkeletonExtractor` to ensure the generator only sees the contract. 602fb45
- [x] Task: Conductor - User Manual Verification 'Test Generation Engine' (Protocol in workflow.md) 468354e

## Phase 2: CLI Command [checkpoint: 81e67e6]
- [x] Task: Add `generate-tests` command to `src/cli.ts`. 341407d
- [x] Task: Implement file discovery and path resolution for the target file. 341407d
- [x] Task: Add `--output` and `--force` flags to control where tests are written. 341407d
- [x] Task: Conductor - User Manual Verification 'CLI Command' (Protocol in workflow.md) 81e67e6

## Phase 3: Integration & Validation [checkpoint: 65deda0]
- [x] Task: Implement a "Dry Run" mode that prints the test code without writing to disk. 341407d
- [x] Task: Add integration tests that verify a generated test file can actually be run by Vitest. b18629d
- [x] Task: Conductor - User Manual Verification 'Integration & Validation' (Protocol in workflow.md) 65deda0

# Track Plan: Mission Control v7 (The Execution Bridge)

## Phase 1: The Engine (CLI Wrapper)
- [x] Task: Create `src/runner/claude.ts` to wrap `claude` CLI. ecba9b1
- [x] Task: Implement `POST /api/runner/run` to trigger headless execution. 3a8b27f
- [x] Task: Implement `POST /api/runner/apply` to write changes to disk. 3a8b27f

## Phase 2: The Control (GUI)
- [x] Task: Add "Run" button to `EdgeReportPanel`. 3a8b27f
- [x] Task: Create `ExecutionModal` to show live progress/logs. 3a8b27f
- [x] Task: Implement `DiffPreview` component for code review. (Simplified to log stream for v7)
- [x] Task: Conductor - User Manual Verification 'Ghost Mode' (Protocol in workflow.md) 3a8b27f

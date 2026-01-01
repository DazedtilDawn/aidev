# Track: Historian Vertical Slice (The First Advisor)

## Goal
Prove the MEM1 architecture by implementing the Historian advisor end-to-end: from raw git history -> distilled facts in `<IS>` -> advisory insight.

## Phase 1: The Source (Git Extraction) ✅
- [x] **Task 1.1:** Implement `GitHistoryService`.
  - [x] Fetch commits touching specific files (last N days/commits).
  - [x] Extract key metadata: hash, author, date, message, diff summary.
  - [x] Output structured JSON.

## Phase 2: The Brain (State Management & Distillation) ✅
- [x] **Task 2.1:** Implement `StateManager` (CRUD for `<IS>`).
  - [x] Read/Write `.aidev/state/internal_state.xml`.
  - [x] Handle concurrent updates (locking not needed for now, but good design).
- [x] **Task 2.2:** Implement `DistillationEngine`.
  - [x] Prompt: "Given these commits, what facts should be remembered?"
  - [x] Update `<IS>` with new Facts (deduplicated).

## Phase 3: The Voice (Advisory Integration) ✅
- [x] **Task 3.1:** Refactor `Historian` advisor.
  - [x] STOP reading raw git logs directly in the advisor.
  - [x] START reading from `<IS>.facts` where `source` starts with `commit:`.
- [x] **Task 3.2:** Wire up the full loop in `PromptPackGenerator`.
  - [x] Anchor Discovery -> Git Extraction -> Distillation -> State Update -> Historian Insight.

## Phase 4: Verification ✅
- [x] **Task 4.1:** Verify end-to-end flow with a real change.
  - [x] Make a commit.
  - [x] Run Context Forge.
  - [x] See the commit distilled into a Fact and presented by the Historian.

## Status: COMPLETE

Verified 2026-01-01:
- Internal state contains 2 distilled facts from previous commits
- Historian advisor successfully reads facts by source prefix
- End-to-end flow: Git → Distillation → State → Historian working

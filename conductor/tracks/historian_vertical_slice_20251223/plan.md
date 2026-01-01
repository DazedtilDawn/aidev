# Track: Historian Vertical Slice (The First Advisor)

## Goal
Prove the MEM1 architecture by implementing the Historian advisor end-to-end: from raw git history -> distilled facts in `<IS>` -> advisory insight.

## Phase 1: The Source (Git Extraction)
- [ ] **Task 1.1:** Implement `GitHistoryService`.
  - [ ] Fetch commits touching specific files (last N days/commits).
  - [ ] Extract key metadata: hash, author, date, message, diff summary.
  - [ ] Output structured JSON.

## Phase 2: The Brain (State Management & Distillation)
- [ ] **Task 2.1:** Implement `StateManager` (CRUD for `<IS>`).
  - [ ] Read/Write `.aidev/state/internal_state.xml`.
  - [ ] Handle concurrent updates (locking not needed for now, but good design).
- [ ] **Task 2.2:** Implement `DistillationEngine`.
  - [ ] Prompt: "Given these commits, what facts should be remembered?"
  - [ ] Update `<IS>` with new Facts (deduplicated).

## Phase 3: The Voice (Advisory Integration)
- [ ] **Task 3.1:** Refactor `Historian` advisor.
  - [ ] STOP reading raw git logs directly in the advisor.
  - [ ] START reading from `<IS>.facts` where `source` starts with `commit:`.
- [ ] **Task 3.2:** Wire up the full loop in `PromptPackGenerator`.
  - [ ] Anchor Discovery -> Git Extraction -> Distillation -> State Update -> Historian Insight.

## Phase 4: Verification
- [ ] **Task 4.1:** Verify end-to-end flow with a real change.
  - [ ] Make a commit.
  - [ ] Run Context Forge.
  - [ ] See the commit distilled into a Fact and presented by the Historian.

# Track: Context Forge - The Intelligence Layer

## Goal
Implement the "Magic" heuristics that transform raw semantic search into a strategically curated context package.

## Phase 1: Behavioral Expansion (The Lattice Walker)
- [ ] **Task 1.1:** Implement `BehavioralAnalyzer`.
  - [ ] Support Peer Patterns (tests, types).
  - [ ] Support Naming Heuristics (Service/Schema/Entity).
  - [ ] Support Manifest/Config detection.
- [ ] **Task 1.2:** Integrate `BehavioralAnalyzer` into `ImpactAnalyzer`.

## Phase 2: Anchor Re-ranking
- [ ] **Task 2.1:** Implement Graph-based re-ranking.
  - [ ] If File A and B match semantically, but A imports B, boost A's anchor score.
- [ ] **Task 2.2:** Multi-query expansion (breaking user intent into sub-queries).

## Phase 3: Fidelity Scoring Model
- [ ] **Task 3.1:** Implement the Weighted Scoring logic in `BudgetAllocator`.
- [ ] **Task 3.2:** Automatic "Thresholding" for Full vs. Skeleton.

## Phase 4: Context Forge UI (Dashboard Pivot)
- [x] **Task 4.1:** Add "Intent Mixer" to the UI.
- [x] **Task 4.2:** Implement "Fidelity Toggles" in the Node list.
- [ ] **Task 4.3:** Add Token Budget Gauge (Visual).

## Phase 5: The Advisory Council (Institutional Memory)
- [ ] **Task 5.1:** Implement `Historian` (Git History Analyzer).
- [ ] **Task 5.2:** Implement `Architect` (Contract/Doc Synthesizer).
- [ ] **Task 5.3:** Implement `Visionary` (Project North Star alignment).
- [ ] **Task 5.4:** Implement `Operator` (Log/Error aggregator).
- [ ] **Task 5.5:** Forge Synthesis (Injecting Council insights into the XML pack).


# Track Plan: Mission Control v4 (Semantic Auto-Context)

## Phase 1: Embedding Foundation
- [x] Task: Create `src/embeddings/client.ts` to interface with LM Studio. ecba9b1
- [x] Task: Create `src/indexing/store.ts` for managing local vector cache. a70c4c2
- [x] Task: Implement `POST /api/indexing/run` to generate embeddings for all project files. ac1a296

## Phase 2: Search & UI
- [~] Task: Implement `POST /api/context/auto-select` endpoint for semantic retrieval.
- [ ] Task: Add "Auto-Select" button to Dashboard sidebar.

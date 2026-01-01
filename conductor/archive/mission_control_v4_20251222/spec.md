# Specification: Mission Control v4 (Semantic Auto-Context)

## Objective
Transform the Dashboard from a manual selection tool into an intelligent "Auto-Pilot" that can infer relevant context from a high-level objective. By integrating with a local LLM (LM Studio) for embeddings, we enable privacy-preserving, zero-cost semantic search over the codebase.

## Architecture

### 1. Embedding Engine (Local)
- **Provider:** LM Studio (OpenAI-compatible API).
- **Endpoint:** `http://localhost:1234/v1/embeddings`.
- **Model:** User's loaded model (e.g., `nomic-embed-text-v1.5`).

### 2. Vector Store (Lightweight)
- **Storage:** Local JSON file (`.aidev/cache/vectors.json`).
- **Structure:** Map of `filepath -> vector[]`.
- **Update Strategy:** On-demand re-indexing (triggered via UI).

### 3. Semantic Search API
- **Endpoint:** `POST /api/context/auto-select`
- **Input:** `{ objective: string, topK: number }`
- **Logic:** 
    1. Embed `objective` via LM Studio.
    2. Compute Cosine Similarity against all file vectors.
    3. Return top `K` files with high relevance scores.

### 4. UI Integration
- **Feature:** "Auto-Select" button next to the "Strategic Brief" input.
- **Feedback:** Highlight selected nodes on the graph automatically.

## Security & Privacy
- All data stays local (localhost to localhost).
- No external API keys required for LM Studio.

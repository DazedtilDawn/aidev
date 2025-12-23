# Internal State Contract: The Constitution of Context Forge

## 1. The Core Principle: Constant Memory, Compounding Wisdom
The Internal State (`<IS>`) is the **only** persistent artifact of the Context Forge. It is a single, XML-based file that represents the system's cumulative understanding of the project. It MUST NOT grow unbounded. It MUST grow in **density**, not volume.

## 2. The Schema (`<IS>`)

```xml
<IS version="1.0">
  <!-- IDENTITY: What is this project? -->
  <project>
    <name>Project Name</name>
    <north_star>The ultimate strategic goal (1-2 sentences)</north_star>
    <core_patterns>Comma-separated list of dominant architectural patterns</core_patterns>
  </project>

  <!-- FACTS: Grounded truths earned through evidence -->
  <!-- Pruning Rule: Least accessed facts with low confidence are discarded first -->
  <facts>
    <fact source="commit|session|log" id="unique_id" confidence="high|medium|low" last_verified="ISO8601">
      A verifiable statement about the codebase or its history.
    </fact>
  </facts>

  <!-- INVARIANTS: Non-negotiable constraints -->
  <!-- Validation Rule: Every session checks 1-2 random invariants against current code -->
  <invariants>
    <invariant file="path/to/file" id="inv_id">
      A rule that must always be true (e.g., "All errors must be structured JSON").
    </invariant>
  </invariants>

  <!-- OPEN THREADS: Active investigations -->
  <!-- Pruning Rule: Threads older than 5 sessions are marked 'stale' or converted to decisions -->
  <open_threads>
    <thread id="thread_id" status="exploring|blocked|validated">
      Description of the ongoing line of inquiry.
    </thread>
  </open_threads>

  <!-- DECISIONS: Crystallized outcomes -->
  <!-- These are the "Resolved Threads" -->
  <decisions>
    <decision context="context_tag" date="ISO8601">
      The choice made and the primary reason for it.
    </decision>
  </decisions>

  <!-- SESSION MEMORY: The Short-Term Buffer -->
  <!-- Pruning Rule: Strictly limited to the last N sessions (e.g., 3-5) -->
  <recent_sessions limit="3">
    <session id="uuid" intent="User's goal" outcome="completed|failed|paused">
      <key_insight>One sentence takeaway from this session</key_insight>
    </session>
  </recent_sessions>
</IS>
```

## 3. Distillation Rules (The Filter)
Information is only promoted to `<IS>` if it meets these criteria:

1.  **Fact Promotion:**
    *   Observation occurs > 1 time (or comes from a high-trust source like a git revert).
    *   It is **specific** (references a file, error code, or pattern).
    *   It is **not** purely structural (structural info belongs in the graph/AST, not IS).

2.  **Invariant Promotion:**
    *   Must be verifiable by static analysis or regex.
    *   Must be stated explicitly by the user or found in `ARCHITECTURE.md`.

3.  **Decision Promotion:**
    *   Must resolve an Open Thread.
    *   Must have a "Why" (rationale).

## 4. Pruning & Entropy Control (The Garbage Collector)
The system runs a "Sleep Cycle" (Pruning Phase) after every session update:

1.  **Fact Decay:** Reduce confidence of facts not referenced in the last 10 sessions. Remove if confidence < low.
2.  **Thread Cleanup:** Warn user about threads open > 5 sessions. Archive or delete.
3.  **Session FIFO:** Strictly enforce the `limit` on `<recent_sessions>`.

## 5. Validation (The Truth Check)
To prevent hallucinations ("drift"), the system performs random spot-checks:

*   **Pre-Flight:** Before generating a Context Pack, verify 1 random Invariant against the current code.
*   **Failure:** If an Invariant fails, flag it as "Broken" in the Advisory Council output and downgrade its confidence in `<IS>`.

## 6. Recovery (The Reset)
If `<IS>` becomes inconsistent (XML errors, logical contradictions):
1.  **Safe Mode:** Load the previous valid snapshot (versioned backups).
2.  **Re-Indexing:** Trigger a full scan (Behavioral + Structural) to rebuild the baseline facts.
3.  **User Override:** Allow the user to manually edit/prune `<IS>` via the CLI (`/conductor edit-memory`).

# Internal State Contract: The Constitution of Context Forge
## Version 2.0 (MEM1-Optimized)

### 1. The Core Principle: Constant Memory, Compounding Wisdom
The Internal State (`<IS>`) is the **only** persistent artifact. It is a single, XML-based constitution that represents the system's cumulative understanding.
*   **Goal:** Wisdom accumulates; Token count remains constant.
*   **Target Utilization:** Maintain Working Memory at **~33% of context window** for peak reasoning accuracy.
*   **Pressure Trigger:** Distillation cycle initiates automatically when context usage hits **70%**.

### 2. The Schema (`<IS>`)

```xml
<IS version="2.0">
  <!-- IDENTITY: The unchanging soul -->
  <project>
    <name>Project Name</name>
    <north_star>The ultimate strategic goal</north_star>
    <core_patterns>Async-first, Functional Core, etc.</core_patterns>
  </project>

  <!-- FACTS: Grounded truths earned through evidence -->
  <!-- Stale Rule: If 'provenance' file changes in Git, confidence -> 'low' -->
  <facts>
    <fact source="commit:hash" id="f1" confidence="high" last_verified="YYYY-MM-DD">
      Token estimator requires null guards (prevented March outage).
    </fact>
  </facts>

  <!-- INVARIANTS: Non-negotiable structural constraints -->
  <invariants>
    <invariant file="src/config.ts" id="i1">
      Configuration must be loaded before any side-effects.
    </invariant>
  </invariants>

  <!-- OPEN THREADS: Active investigations -->
  <open_threads>
    <thread id="t1" status="blocked" reason="event loop coupling">
      Async refactor of ImpactAnalyzer.
    </thread>
  </open_threads>

  <!-- DECISIONS: Crystallized outcomes (Resolved Threads) -->
  <decisions>
    <decision context="error-handling" date="2025-12-23">
      Chose explicit try/catch over Result monad due to team familiarity.
    </decision>
  </decisions>

  <!-- SESSION MEMORY: Short-Term Buffer -->
  <!-- FIFO Rule: Strictly limited to last 3 sessions -->
  <recent_sessions limit="3">
    <session id="s23" intent="Add error handling" outcome="completed">
      <insight>Validation logic belongs in the schema, not the controller.</insight>
    </session>
  </recent_sessions>
</IS>
```

### 3. The Distillation Cycle (Trigger: >70% Pressure)
When context pressure exceeds 70%, the system pauses to **Distill & Prune**:

| From | To | Rule |
| :--- | :--- | :--- |
| **Raw Scaffolding** | **Discarded** | File contents, logs, and tool outputs are ephemeral. |
| **Observation** | **Fact** | Promoted if observed >1 time or from high-trust source (Git). |
| **Open Thread** | **Decision** | Promoted if code change resolves the thread intent. |
| **Unreferenced Fact** | **Pruned** | Facts not cited in last 10 sessions are archived. |

### 4. Codebase-Specific Staleness Rules
Unlike generic agents, Context Forge listens to the filesystem:
1.  **File Modification:** If `src/foo.ts` changes, all Facts citing it as `provenance` are downgraded to `confidence="low"`.
2.  **Revert Detection:** If a commit reverts a previous change, the associated Decision is flagged for review.
3.  **Invariant Check:** 1 random Invariant is verified against code before every session. Failure = Alert.

### 5. Implementation Strategy (Option B -> A)
*   **Current State (Option B):** Use **Claude 3.5 Sonnet** with structured prompts to perform the Distillation and Council generation.
*   **Future State (Option A):** Drop in **Qwen2.5-7B-RL-RAG** (via vLLM) for the Distillation step to reduce cost/latency without changing the schema.

### 6. Recovery
If `<IS>` corruption occurs:
1.  **Load Last Known Good** (Versioned via Git).
2.  **Re-Scan:** Trigger standard `ImpactAnalyzer` + `Historian` to rebuild baseline Facts.
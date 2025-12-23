# Architecture: High-Fidelity Context Engine (AIDEV)

## 1. Vision: Intelligence Amplification
The Context Engine transforms raw code into **Institutional Wisdom**. It provides an AI with the "Briefing" a senior developer would give a trusted peer.

## 2. Discovery & Expansion (The Lattice)
- **Semantic Anchor Resolver:** Identifies the "Hot Spots" using vector similarity.
- **Behavioral Expansion:** Follows peer patterns (tests, types) and domain naming conventions.
- **Structural Expansion:** Maps explicit AST dependencies.

## 3. The Advisory Council (The Lens Layer)
Before the Context Pack is forged, the Advisory Council synthesizes insights from project artifacts:

| Advisor | Source | Focus |
| :--- | :--- | :--- |
| **Historian** | Git Log / Blame | Past decisions, regressions, and "Why" changes occurred. |
| **Architect** | ADRs / Docs / Schemas | Invariants, design patterns, and structural integrity. |
| **Operator** | Logs / Error Traces | Runtime reality, edge cases, and performance bottlenecks. |
| **Visionary** | VISION.md / README | Alignment with the project's long-term North Star. |
| **Skeptic** | Cross-Ref Analysis | Potential pitfalls, alternative paths, and "What if we're wrong?" |

## 4. Multi-Tier Fidelity Model
Assigns content depth based on score:
- **FULL (>= 0.8):** Direct work sites.
- **SKELETON (0.4 - 0.8):** Interface surface areas.
- **ABSTRACT (< 0.4):** Pure metadata or council summaries.

## 5. The Artifact: The Briefing Pack
The final output is an XML/Markdown structure where Council Insights precede the code, setting the mental stage for the LLM.

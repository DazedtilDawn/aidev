# Specification: Mission Control v2 (Advanced Visualization & Edge Integration)

## Objective
Upgrade the Mission Control dashboard from a basic visualizer to a high-fidelity analytical tool. This includes implementing advanced graph layout algorithms for better insight discovery and integrating the "Edge Analyst" persona to standardize high-value AI interactions.

## Core Features

### 1. Edge Analyst Integration
- **New Preset:** `edge-analyst`
- **Function:** Wraps the generated context in the "EDGECRAFT" system prompt, instructing the AI to act as a strategic consultant.
- **Goal:** Standardize the output format for high-impact reasoning tasks.

### 2. Advanced Visualization (The "Space Map")
- **Force-Directed Layout:** Use physics-based positioning (repulsion/attraction) to naturally reveal cluster dependency structures.
- **Node Clustering:** Visually group nodes based on their directory depth or module boundaries to reduce cognitive load.
- **Edge Bundling:** (Optional/Stretch) Visually merge parallel edges to reduce clutter.
- **Interactive Filtering:**
    - **Hover:** Highlight immediate dependencies (upstream/downstream).
    - **Click:** Focus mode (dim unrelated nodes).
    - **Search:** Real-time filter by filename/path.

### 3. Responsive UX
- Ensure the graph canvas and sidebars adapt gracefully to different window sizes.

## Tech Stack Changes
- **Frontend:** Add `d3-force` (or similar layout engine compatible with ReactFlow) if standard ReactFlow layouts are insufficient.
- **State:** Enhanced React state for filtering and clustering.

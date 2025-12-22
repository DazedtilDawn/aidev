# Track Plan: Mission Control (Visual Dashboard)

## Phase 1: Headless Server (The Brain) [checkpoint: ad25e64]
- [x] Task: Scaffold Express server in `src/server/index.ts`. ac1a296
- [x] Task: Implement `GET /api/graph` to return project model, nodes, and risk metadata. ac1a296
- [x] Task: Implement `POST /api/prompt` to generate formatted context packets based on UI selection. ac1a296
- [x] Task: Conductor - User Manual Verification 'Headless Server' (Protocol in workflow.md) ad25e64

## Phase 2: Visual Dashboard (The Face)
- [~] Task: Scaffold React + Vite application in `src/dashboard/`.
- [ ] Task: Implement Force-Directed Graph using `reactflow` to visualize dependencies and risk heatmaps.

## Phase 3: Ghost Mode (Real-time Automation)
- [ ] Task: Integrate `chokidar` for file system watching.
- [ ] Task: Implement WebSocket (Socket.io) updates to push graph changes to the UI instantly.
- [ ] Task: Add `aidev dashboard` command to CLI to launch server and open browser.
- [ ] Task: Conductor - User Manual Verification 'Ghost Mode' (Protocol in workflow.md)

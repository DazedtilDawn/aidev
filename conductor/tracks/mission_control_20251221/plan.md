# Track Plan: Mission Control (Visual Dashboard) [checkpoint: 0d207b3]

## Phase 1: Headless Server (The Brain)
- [x] Task: Scaffold Express server in `src/server/index.ts`. ac1a296
- [x] Task: Implement `GET /api/graph` to return project model, nodes, and risk metadata. ac1a296
- [x] Task: Implement `POST /api/prompt` to generate formatted context packets based on UI selection. ac1a296
- [x] Task: Conductor - User Manual Verification 'Headless Server' (Protocol in workflow.md) ad25e64

## Phase 2: Visual Dashboard (The Face)
- [x] Task: Scaffold React + Vite application in `src/dashboard/`. 101c6a9
- [x] Task: Implement Force-Directed Graph using `reactflow` to visualize dependencies and risk heatmaps. 101c6a9
- [x] Task: Build the "Context Mixer" UI: Sidebar for file selection with Full/Skeleton/Exclude toggles. 101c6a9
- [x] Task: Conductor - User Manual Verification 'Visual Dashboard' (Protocol in workflow.md) 0d207b3

## Phase 3: Ghost Mode (Real-time Automation)
- [x] Task: Integrate `chokidar` for file system watching. 1ab47c5
- [x] Task: Implement WebSocket (Socket.io) updates to push graph changes to the UI instantly. 1ab47c5
- [x] Task: Add `aidev dashboard` command to CLI to launch server and open browser. 1ab47c5
- [x] Task: Conductor - User Manual Verification 'Ghost Mode' (Protocol in workflow.md) 0d207b3

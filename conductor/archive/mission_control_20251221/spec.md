# Specification: Mission Control (Visual Dashboard)

## Objective
Transform the `aidev` workflow from command-line text generation to visual context orchestration. This track provides a "Mission Control" center where developers can see their repo's topology, identify high-risk files, and manually fine-tune the context "mix" (Full vs. Skeleton) before generating prompts.

## Technical Approach
1.  **Headless Architecture:** A local Node.js server (Express) acts as the bridge between the existing CLI logic and the UI.
2.  **Visual Topology:** Use `reactflow` to render the dependency graph. Node size/color will be driven by the `fanIn` and `risk` metadata implemented in the previous track.
3.  **Context Mixer:** A reactive UI that allows toggling file states. As the user toggles files, the server re-calculates the estimated token count in real-time.
4.  **Real-time Sync:** A watcher daemon ensures the UI always reflects the current state of the filesystem and dependency graph.

## Component Stack
- **Server:** Express, Socket.io, chokidar (watcher).
- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui, reactflow.
- **API:** REST for static queries, WebSockets for live updates.

## Safety & Portability
- **Local Only:** The server binds to `localhost` by default.
- **Portable UI:** The dashboard can be opened in a browser or embedded in a VS Code WebView.

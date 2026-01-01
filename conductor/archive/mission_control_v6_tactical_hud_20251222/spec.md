# Specification: Mission Control v6 (The Tactical HUD)

## Objective
Evolve the dashboard into a **Strategic Command Center**. The system will no longer just gather context; it will process that context through the **Edge Analyst** logic and present an actionable "Tactical HUD" that allows for one-click project governance.

## Core Features

### 1. The Edge Panel (Actionable Intelligence)
- **UI:** A sliding right-sidebar that renders the `edge-analyst` report.
- **Components:**
    - **Bottom Line Component:** High-impact summary.
    - **Insight Cards:** Interactive list of key insights.
    - **Backlog Sync:** A button next to each "Execution Backlog" item to add it to the project plan.

### 2. Live System Logs (Terminal HUD)
- **UI:** A collapsible bottom panel.
- **Function:** Real-time stream of server activity, indexing progress, and git status.

### 3. Integrated Action Center
- **Promote to Track:** Convert an Edge Report into a full Conductor Track folder with one click.

## Technical Approach
- Use `react-markdown` for report rendering.
- State management for "Reports" history.
- Backend logic to generate Track scaffolding from the report structure.

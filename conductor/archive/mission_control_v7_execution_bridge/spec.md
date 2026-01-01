# Specification: Mission Control v7 (The Execution Bridge)

## Objective
Close the loop between "Planning" and "Doing." This track integrates the **Claude Code CLI** into Mission Control, allowing the user to execute the generated "Context Packs" directly from the dashboard and apply the resulting code changes.

## Core Features

### 1. Claude Runner Service
- **Technology:** Node.js `spawn` wrapper around `claude` CLI.
- **Mode:** Headless (`-p` prompt, `--output-format json`).
- **Capabilities:**
    - Execute prompt.
    - Capture JSON output (cost, result, session ID).
    - Handle tool use (read/write).

### 2. Execution Interface
- **UI:** "Run in Ghost Mode" button in the Edge Report panel.
- **Feedback:** Live stream of tokens/steps via Socket.io.

### 3. Diff Review & Apply
- **UI:** A Monaco Diff Editor modal showing the proposed changes vs. current file content.
- **Action:** "Apply Changes" button that commits the diffs to disk.

## Security
- **Permissions:** User must explicitly approve "Apply."
- **Sandboxing:** The runner operates with the permissions of the local user (assumed developer trust).

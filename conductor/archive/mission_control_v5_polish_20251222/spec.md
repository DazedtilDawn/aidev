# Specification: Mission Control v5 (UX & Visual Polish)

## Objective
Elevate the Mission Control dashboard from a functional prototype to a polished, professional tactical tool. This involves removing browser-native dialogs (alerts), improving feedback loops, and adding high-value UI utilities for context management.

## Core Features

### 1. Prompt Preview Modal
- **Description:** A high-fidelity overlay that displays the generated XML/JSON prompt.
- **Features:** 
    - Copy to clipboard button.
    - Code-block styling with basic syntax highlighting.
    - Download as file option.

### 2. Feedback System (Toasts)
- **Description:** Replace `alert()` with non-blocking toast notifications.
- **Triggers:** Indexing complete, prompt generated, errors.

### 3. Mixer Utilities
- **Clear All:** Reset context selection in one click.
- **Trace Hub:** Select a node and automatically include all its immediate dependencies (upstream/downstream).

### 4. Visual Refinement
- **Typography:** Refine font sizes and weights for better hierarchy.
- **Glassmorphism:** Improve the sidebar and modal backgrounds with better blur and border treatments.

## Tech Stack
- No new major dependencies. Will use `lucide-react` for icons and standard React/Tailwind for components.

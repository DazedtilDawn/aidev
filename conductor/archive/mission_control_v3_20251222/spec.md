# Specification: Mission Control v3 (Visual Preset Selector)

## Objective
Expose the powerful CLI preset system (including the new "Edge Analyst" persona) to the Mission Control visual interface. Users should be able to select a strategic persona/preset from a dropdown in the dashboard sidebar, ensuring the generated context packet is tailored to their specific intent (e.g., "Edge Analyst" for strategy, "Bugfix" for repair).

## Features

### 1. Preset Discovery API
- **Endpoint:** `GET /api/presets`
- **Response:** JSON array of available presets `{ id: string, title: string, description?: string }[]`.
- **Source:** `PresetResolver` (reuse existing CLI logic).

### 2. Dashboard UI
- **Component:** "Persona Selector" dropdown in the Sidebar (Strategic Brief section).
- **Behavior:** Fetches presets on load. Default to "Universal" or "None".

### 3. Generation Pipeline
- **Flow:** UI passes `presetId` to `POST /api/prompt`.
- **Backend:** `PromptPackGenerator` applies the selected preset logic.

## Technical Approach
- Reuse `PresetResolver` in the Express server.
- Add `preset` field to the payload of `generatePrompt` in `App.tsx`.

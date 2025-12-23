# Specification: Bugfix - Input Focus Crash

## Problem
The Mission Control dashboard UI "disappears" (likely a white-screen crash) when the user clicks inside the "Strategic Brief" text area.

## Potential Causes
1.  **Event Bubbling:** Click event propagating to `ReactFlow` or `d3` logic unexpectedly.
2.  **State Cycle:** Focusing the textarea triggers a state update that causes a render loop or undefined error.
3.  **Z-Index/Layout:** The textarea might be fighting with the canvas for focus.

## Solution
- Isolate the `textarea` event handling.
- Verify `onFocus`/`onChange` handlers.
- Add Error Boundary to identifying the crash stack trace.

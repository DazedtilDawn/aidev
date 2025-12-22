# Track Specification: Smart Prompt Templates & Presets

## Outcome
Turn `aidev prompt` from a passive context bundle into a task-tuned “instruction manual” that consistently elicits:
* the *right* analysis focus for the job (bugfix vs refactor vs tests),
* a structured plan,
* a constrained implementation (diffs only where allowed),
* and higher signal-to-noise from impacted context.

## Definition of Done
* `aidev prompt --preset <type>` works with at least: `bugfix`, `feature`, `refactor`, `test`.
* Each preset injects:
  1. role/system guidance,
  2. a structured workflow (“Analyze → Plan → Implement”),
  3. explicit output requirements (diff format, test expectations, constraints).
* The prompt pack includes a **“Why included”** relationship summary for impacted files (short paths from changed → impacted).
* Presets are extensible via user-defined templates without code changes.
* Docs + examples exist and match the CLI.

## CLI Spec (minimal but powerful)

### New flags
* `--preset <name>`: Selects a built-in or user-defined prompt template.
* `--list-presets`: Prints available presets (built-in + discovered local).
* `--preset-dir <path>`: (optional but recommended) Loads user templates from a directory (e.g. `.aidev/presets/`).
* `--preset-file <path>`: (optional) Directly load a single preset file (useful for experiments).
* `--preset-help <name>`: Prints the resolved template (or at least the “system instructions” + output contract).

### Backwards compatibility
* Default behavior when `--preset` omitted: `generic` (current output).
* Existing formatters remain untouched; they just receive “extra guidance blocks” to place in the pack.

## Template Format Proposal
Use **Markdown with YAML frontmatter**. It stays human-editable, diffable, and easy to extend.

**Example: `bugfix.md`**
```md
---
id: bugfix
title: Senior Debugging Engineer
output:
  format: unified_diff
  allow_changes_outside_changed_files: false
  include_tests: if_needed
---
# System Instructions
You are a Senior Debugging Engineer.
Your job is to find the most likely root cause and propose a minimal, safe fix.

## Hard Constraints
- Do not invent files or functions that do not exist in the provided context.
- Prefer minimal diffs.
- If information is missing, explicitly list what’s missing and provide a best-effort fix bounded to the given code.

# Workflow
## 1) Analysis (brief, high-signal)
- Identify what changed and the most likely failure modes.
- Use the “Context Rationale” to understand how impacted files relate
...
```

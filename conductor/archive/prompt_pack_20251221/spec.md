# Track Specification: Prompt Pack Generator

## Overview
This track focuses on implementing the "Prompt Pack Generator," a core feature of AIDEV. This feature will allow the tool to take the code context gathered from impact analysis and format it into optimized bundles (prompt packs) for specific AI providers (initially Claude and OpenAI).

## Goals
1.  **Format Agnostic:** Create a flexible templating system to support multiple output formats.
2.  **Provider Support:** Implement specific formatters for:
    -   **Claude:** XML-based format with distinct sections for system prompts, context, and user instructions.
    -   **OpenAI:** JSON/Message-based format suitable for the Chat Completions API.
3.  **CLI Integration:** Wire the generator into the `aidev prompt` command.
4.  **Token Budget Compliance:** Ensure the generated pack respects the user-defined token budget (using the existing `src/prompt/allocator.ts`).

## Detailed Requirements

### 1. Templating Engine
-   Design a lightweight interface for `PromptFormatter`.
-   Input: `ContextBundle` (list of files, metadata, analysis results).
-   Output: `string` (formatted prompt) or `JSON` object.

### 2. Formatters
-   **ClaudeFormatter:**
    -   Wrap file contents in `<file path="...">...</file>` tags.
    -   Include a `<context_map>` section showing the dependency graph.
    -   Add `<instructions>` if provided.
-   **OpenAIFormatter:**
    -   Structure as an array of messages: `[{ role: "system", content: "..." }, { role: "user", content: "..." }]`.
    -   File contents should be clearly delimited within the user message or a dedicated system message depending on best practices.

### 3. CLI Command (`aidev prompt`)
-   Update `src/commands/prompt.ts` to accept:
    -   `--provider <name>` (claude, openai, etc.)
    -   `--budget <tokens>` (default: max model context - buffer)
    -   `--format <type>` (xml, json, text) - defaults based on provider.
-   Output the result to `stdout` (for piping) or a file.

### 4. Integration
-   Use `ImpactAnalyzer` to get the relevant files.
-   Use `TokenEstimator` to verify the final pack size.
-   Use `SecretRedactor` to clean content before formatting.

## Non-Functional Requirements
-   **Determinism:** The same input must always produce the exact same prompt pack output.
-   **Performance:** Formatting should be near-instantaneous (<500ms for typical bundles).
-   **Extensibility:** Adding a new provider (e.g., Llama) should only require adding a new Formatter class.

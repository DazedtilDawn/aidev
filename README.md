# AIDEV

AI-assisted development context generator. Analyzes code changes, maps their impact across a codebase, and generates curated context bundles for AI coding assistants.

## Status

**MVP Foundation Complete** (Tasks 1-10) | 74 tests passing

## Features

### Implemented

- **Impact Analysis** - BFS traversal of dependency graph with O(1) dequeue and deterministic output
- **Token Estimation** - Provider-neutral interface with OpenAI (tiktoken) and generic estimators
- **Secret Redaction** - Pattern-based detection of API keys, passwords, tokens, connection strings
- **Budget Allocation** - Category-based token budgets with validation and deterministic tie-breaking
- **Git Integration** - Diff parsing, staged/unstaged changes, file content retrieval
- **Project Model** - YAML-based component definitions with reverse dependency maps

### Planned (Tasks 11-20)

- TypeScript/Python AST scanners
- Discovered graph builder
- Prompt pack generator
- Provider adapters (Claude XML, OpenAI messages)
- CLI command wiring
- Model sync

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Analyze impact of changes
npx aidev impact --staged
npx aidev impact --diff HEAD~1..HEAD

# Generate prompt pack (coming soon)
npx aidev prompt --provider claude --budget 100000

# Sync model with codebase (coming soon)
npx aidev sync --check
```

## Project Structure

```
src/
├── cli.ts                 # Entry point
├── commands/              # CLI commands (impact, prompt, sync)
├── schemas/               # Zod schemas (component, edge, config)
├── model/                 # YAML model loader
├── git/                   # Git diff parser and service
├── impact/                # Impact analyzer with BFS traversal
├── tokens/                # Token estimators (OpenAI, generic)
├── security/              # Secret redactor
├── prompt/                # Budget allocator
├── errors/                # Error classes with exit codes
└── utils/                 # Path normalization, stable sorting
```

## Configuration

Create `.aidev/` in your project root:

```
.aidev/
├── config.yaml
└── model/
    └── components/
        ├── auth.yaml
        └── database.yaml
```

### Component Definition

```yaml
# .aidev/model/components/auth.yaml
name: auth-service
description: Authentication and authorization
paths:
  - src/auth/**
  - src/middleware/auth.ts
depends_on:
  - database
  - config
```

## Architecture

### Determinism Contract

All operations are deterministic:
- Path normalization (Windows → POSIX)
- Stable sorting with locale-independent comparison
- Sorted adjacency lists in BFS traversal
- Frozen default configurations

### Token Estimation

| Provider | Estimator | Accuracy |
|----------|-----------|----------|
| OpenAI | tiktoken | Exact |
| Claude | Generic (chars/3.5 + 10%) | Conservative |
| Others | Generic | Conservative |

### Error Handling

| Error Type | Exit Code |
|------------|-----------|
| ConfigError | 10 |
| GitError | 20 |
| ParseError | 30 |
| ScanError | 40 |
| SecurityError | 50 |

## Development

```bash
# Run tests
npm test

# Run in dev mode
npm run dev -- impact --help

# Build
npm run build
```

## License

MIT

# AIDEV

**Smart context for AI coding assistants.** Give Claude and GPT exactly the files they need.

## Quick Start

```bash
# In any git repo
npx @anthropic/aidev init

# See what your changes affect
npx @anthropic/aidev impact --staged

# Generate context for Claude
npx @anthropic/aidev prompt --staged --task "Fix the auth bug" --copy
```

That's it. Paste into Claude or ChatGPT.

## Install Globally (Optional)

```bash
npm install -g @anthropic/aidev

# Now just use:
aidev impact --staged
aidev prompt --staged --copy
```

## What It Does

When you change code, AIDEV figures out what else is affected:

```
$ aidev impact --staged

📊 Impact Analysis Report

Changed Files:
  ✏️ src/auth/login.ts

Affected Components:
  📦 authentication
  📦 user-service

Impacted Files:
  📄 src/auth/session.ts (95%)
  📄 src/api/middleware.ts (87%)
  📄 src/users/profile.ts (72%)
```

Then generates a context pack with just those files:

```
$ aidev prompt --staged --task "Add rate limiting" --budget 50000

📦 Prompt Pack Summary
  Tokens: 12,450 / 50,000 (25% utilization)
  Files: 8 included, 2 redacted
  Components: authentication, user-service

✓ Copied to clipboard
```

## Features

| Feature | What It Does |
|---------|--------------|
| **Impact Analysis** | Traces how changes ripple through your codebase |
| **Smart Selection** | Picks the most relevant files within token budget |
| **Secret Redaction** | Auto-removes API keys, passwords, tokens |
| **Token Budgeting** | Fits context to model limits (Claude: 200k, GPT-4: 128k) |
| **State Tracking** | Maintains reasoning context across sessions |

## Commands

### `aidev init`
Set up AIDEV in your project. Creates `.aidev/` config folder.

### `aidev impact`
Analyze what your changes affect.

```bash
aidev impact --staged              # Staged changes
aidev impact --diff HEAD~3         # Last 3 commits
aidev impact --explain src/api.ts  # Why is this file impacted?
```

### `aidev prompt`
Generate context packs for AI assistants.

```bash
aidev prompt --staged --task "Review my changes"
aidev prompt --preset bugfix --staged  # Use smart bugfix template
aidev prompt --list-presets            # See available presets
aidev prompt --provider claude --budget 150000 --arch   # Include architecture docs
aidev prompt --provider openai --budget 50000 --output prompt.json
aidev prompt --staged --copy  # Copy to clipboard
```

#### Custom Presets

Create a markdown file with YAML frontmatter in your project or any path:

```md
---
id: review
title: Senior Code Reviewer
---
# System Instructions
You are a Senior Code Reviewer. Review the following changes for logic errors.

# Task
{{task}}
```

Use it with: `aidev prompt --preset ./my-preset.md`

### `aidev sync`
Discover file dependencies in your codebase.

```bash
aidev sync         # Update dependency graph
aidev sync --check # Check for drift
```

### `aidev state`
Track objectives, decisions, and questions across sessions.

```bash
aidev state                                      # View current state
aidev state --objective "Implement auth"         # Add goal
aidev state --decide "Use JWT" --why "Standard"  # Record decision
aidev state --refresh --staged                   # Update from code
```

## How It Works

1. **Dependency Graph** - Scans imports to build a dependency graph
2. **Impact Analysis** - Traces how changes ripple through the graph
3. **Smart Selection** - Prioritizes files by relevance within token budget
4. **Secret Redaction** - Detects and removes API keys, passwords, tokens
5. **Format Output** - Generates provider-optimized context

## Configuration

After `aidev init`, customize `.aidev/config.yaml`:

```yaml
# Token budgets per provider
budgets:
  claude: 150000
  openai: 100000

# Files to always exclude
exclude:
  - "**/*.test.ts"
  - "**/node_modules/**"
```

## Requirements

- Node.js 18+
- Git repository

## License

MIT

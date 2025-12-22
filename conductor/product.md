# Initial Concept
AI-assisted development context generator. Analyzes code changes, maps their impact across a codebase, and generates curated context bundles for AI coding assistants.

# Target Users
- Individual software developers looking to improve their AI-assisted coding workflow by providing precise, mapped context to AI assistants.

# Core Goals
- **Token Efficiency:** Reduce token usage and costs by sending only the most relevant code context based on impact analysis.
- **Improved AI Accuracy:** Improve the quality of AI-generated code by providing precise dependency maps and relevant code relationships.
- **Workflow Automation:** Automate the manual process of gathering relevant files and context for AI prompts, making AI integration seamless.

# Key Features
- **Impact Analysis:** BFS traversal of dependency graphs to identify relevant code changes.
- **Token Estimation:** Provider-neutral estimation for OpenAI (tiktoken) and Claude.
- **Secret Redaction:** Pattern-based detection to ensure sensitive information is never sent to AI providers.
- **Budget Allocation:** Smart category-based token budgets to fit context into model limits.
- **Prompt Generation:** Optimized templates for Claude XML and OpenAI message formats.
- **Smart Guidance (Presets):** Task-tuned prompt templates (Bugfix, Feature, Test, Refactor) that guide LLMs with structured workflows and constraints.
- **Context Rationale:** Automatically explains why each file is included in the context bundle.
- **Visual Context Dashboard (Mission Control):** A React-based visual interface for repository topology, risk analysis, and manual context orchestration.
- **Real-time Sync (Ghost Mode):** Live updates between the filesystem and the dashboard using WebSockets and file watching.
- **Edge Analyst Persona:** Built-in "Edge Analyst" preset, selectable via GUI, for strategic, high-value AI interactions.
- **Semantic Auto-Pilot:** Intent-based context selection using local codebase embeddings (LM Studio integration).
- **Automated Scanning (Planned):** TypeScript and Python AST scanners for automatic dependency discovery.

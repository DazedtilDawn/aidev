# Product Guidelines

## Tone and Style
- **Friendly and Approachable:** The CLI output and documentation should use conversational yet professional language. While technical accuracy is paramount, the tool should feel like a helpful assistant rather than a rigid compiler.

## Development Principles
- **Extreme Determinism:** All operations—including path normalization, dependency traversal, and token estimation—must be deterministic and reproducible across different operating systems and environments.
- **Modular Extensibility:** The architecture must remain highly modular to support the easy addition of new language scanners (AST), token estimators, and AI provider adapters.

## User Interface (CLI) & Feedback
- **Actionable Errors:** Errors must not only state what went wrong but also provide a clear path to resolution or relevant documentation.
- **Machine & Human Friendly:** Support specific exit codes for automation while providing rich, formatted output (e.g., using `chalk`) and progress indicators for interactive users.
- **Safety First:** Ensure that secret redaction is always active and that users are warned before any potentially sensitive data is processed.

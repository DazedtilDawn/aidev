# Technology Stack

## Core Development
- **Language:** [TypeScript](https://www.typescriptlang.org/) (v5.9.3+) - Ensuring type safety and modern language features.
- **Runtime:** [Node.js](https://nodejs.org/) - Utilizing the `tsx` runner for development and `tsc` for builds.

## Frameworks and Libraries
- **CLI Framework:** [Commander.js](https://github.com/tj/commander.js/) - Handling command-line arguments and subcommands.
- **Validation:** [Zod](https://zod.dev/) - Defining and validating schemas for components, config, and state.
- **Git Integration:** [simple-git](https://github.com/steveukx/node-simple-git) - Programmatic access to git diffs and status.
- **YAML Parsing:** [js-yaml](https://github.com/nodeca/js-yaml) - Loading and saving project component definitions.
- **Token Estimation:** [tiktoken](https://github.com/dqbd/tiktoken) - Accurate token counting for OpenAI models.
- **CLI Styling:** [chalk](https://github.com/chalk/chalk) - Providing rich, colored terminal output.

## Testing and Quality
- **Test Runner:** [Vitest](https://vitest.dev/) - Fast, Vite-native testing framework for unit and integration tests.
- **Build Tool:** [TypeScript Compiler (tsc)](https://www.typescriptlang.org/docs/handbook/compiler-options.html) - Compiling source to highly compatible ESM/CJS in `dist/`.

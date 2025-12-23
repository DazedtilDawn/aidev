# Technology Stack

## Core Development
- **Language:** [TypeScript](https://www.typescriptlang.org/) (v5.9.3+) - Ensuring type safety and modern language features.
- **Runtime:** [Node.js](https://nodejs.org/) - Utilizing the `tsx` runner for development and `tsc` for builds.

## Frameworks and Libraries
- **CLI Framework:** [Commander.js](https://github.com/tj/commander.js/) - Handling command-line arguments and subcommands.
- **Validation:** [Zod](https://zod.dev/) - Defining and validating schemas for components, config, and state.
- **Frontmatter Parsing:** [gray-matter](https://github.com/jonschlinkert/gray-matter) - Parsing YAML frontmatter in prompt templates.
- **Git Integration:** [simple-git](https://github.com/steveukx/node-simple-git) - Programmatic access to git diffs and status.
- **YAML Parsing:** [js-yaml](https://github.com/nodeca/js-yaml) - Loading and saving project component definitions.
- **Web Server:** [Express](https://expressjs.com/) - Powering the Mission Control API.
- **Real-time Communication:** [Socket.io](https://socket.io/) - Real-time sync between server and dashboard.
- **Frontend Framework:** [React](https://react.dev/) + [Vite](https://vitejs.dev/) - Modern dashboard development.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS for the visual interface.
- **Markdown Rendering:** [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) - Renders high-fidelity tactical reports.
- **Graph Visualization:** [reactflow](https://reactflow.dev/) - Interactive dependency mapping.
- **Local Embeddings:** [LM Studio](https://lmstudio.ai/) - Local inference server for privacy-preserving codebase indexing.
- **Physics Layout:** [d3-force](https://d3js.org/d3-force) - Force-directed graph layout for organic topology visualization.
- **Token Estimation:** [tiktoken](https://github.com/dqbd/tiktoken) - Accurate token counting for OpenAI models.
- **CLI Styling:** [chalk](https://github.com/chalk/chalk) - Providing rich, colored terminal output.

## Testing and Quality
- **Test Runner:** [Vitest](https://vitest.dev/) - Fast, Vite-native testing framework for unit and integration tests.
- **Build Tool:** [TypeScript Compiler (tsc)](https://www.typescriptlang.org/docs/handbook/compiler-options.html) - Compiling source to highly compatible ESM/CJS in `dist/`.

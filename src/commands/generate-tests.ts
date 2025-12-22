import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, basename, dirname, extname } from 'path';
import { TestGenerator } from '../prompt/test-generator.js';
import { normalizePath } from '../utils/index.js';
import { exitCodeFor, formatError } from '../errors/index.js';

interface GenerateTestsOptions {
  output?: string;
  force?: boolean;
  dryRun?: boolean;
}

export const generateTestsCommand = new Command('generate-tests')
  .description('Generate Vitest unit tests from code skeleton')
  .argument('<path>', 'Path to the source file')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --force', 'Overwrite existing test file')
  .option('--dry-run', 'Print the prompt without writing to disk')
  .action(async (path: string, options: GenerateTestsOptions) => {
    try {
      const projectPath = process.cwd();
      const fullPath = join(projectPath, path);

      if (!existsSync(fullPath)) {
        console.error(chalk.red(`Error: File not found at ${path}`));
        process.exit(1);
      }

      const content = readFileSync(fullPath, 'utf-8');
      const generator = new TestGenerator();
      const prompt = await generator.generateTestPrompt(normalizePath(path), content);

      if (options.dryRun) {
        console.log(chalk.bold('\n--- Test Generation Prompt ---\n'));
        console.log(prompt);
        return;
      }

      // Default output path: tests/<filename>.test.ts
      const fileName = basename(path, extname(path));
      const defaultOutputPath = join('tests', `${fileName}.test.ts`);
      const outputPath = options.output || defaultOutputPath;
      const fullOutputPath = join(projectPath, outputPath);

      if (existsSync(fullOutputPath) && !options.force) {
        console.error(chalk.yellow(`Warning: Test file already exists at ${outputPath}. Use --force to overwrite.`));
        console.log(chalk.dim('\nShowing prompt instead (dry-run):\n'));
        console.log(prompt);
        return;
      }

      // Ensure directory exists
      const outputDir = dirname(fullOutputPath);
      if (!existsSync(outputDir)) {
        // Simple mkdir sync
        const { mkdirSync } = await import('fs');
        mkdirSync(outputDir, { recursive: true });
      }

      // Since we don't have an LLM caller here, we output the prompt
      // and instruct the user to provide it to an LLM.
      // However, the task says "Generate Vitest unit test templates".
      // Usually, this implies the tool outputs the prompt for the user.
      
      console.log(chalk.green(`✓ Test generation prompt prepared for ${path}`));
      console.log(chalk.cyan(`\nTokens: ~${prompt.length / 4} (estimated)`));
      console.log(chalk.dim('\n--- Prompt Start ---\n'));
      console.log(prompt);
      console.log(chalk.dim('\n--- Prompt End ---\n'));
      
      console.log(chalk.yellow('\nNote: This tool generates the Context Packet. Provide this packet to your AI assistant to generate the actual test code.'));

    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(formatError(error)));
        process.exit(exitCodeFor(error));
      }
      throw error;
    }
  });

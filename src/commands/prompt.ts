import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { loadProjectModel } from '../model/index.js';
import { GitService } from '../git/index.js';
import { ImpactAnalyzer } from '../impact/index.js';
import { PromptPackGenerator } from '../prompt/index.js';
import { createAdapter } from '../providers/index.js';
import { exitCodeFor, formatError } from '../errors/index.js';

interface PromptOptions {
  provider: string;
  budget: string;
  diff?: string;
  staged?: boolean;
  task?: string;
  output?: string;
  copy?: boolean;
  arch?: boolean;
  contracts?: boolean;
  json?: boolean;
}

export const promptCommand = new Command('prompt')
  .description('Generate prompt pack for AI assistants')
  .option('--provider <name>', 'Target provider (claude, openai)', 'claude')
  .option('--budget <tokens>', 'Token budget', '100000')
  .option('--diff <ref>', 'Git diff reference (e.g., HEAD~1)')
  .option('--staged', 'Use staged changes')
  .option('--task <description>', 'Task description to include')
  .option('--output <path>', 'Output file path')
  .option('--copy', 'Copy to clipboard (requires clipboardy)')
  .option('--arch', 'Include architecture documentation')
  .option('--contracts', 'Include component contracts')
  .option('--json', 'Output manifest as JSON only')
  .action(async (options: PromptOptions) => {
    try {
      const projectPath = process.cwd();

      // Load project model
      const model = await loadProjectModel(projectPath);

      // Get changed files
      const gitService = new GitService(projectPath);
      let changedFiles;

      if (options.staged) {
        changedFiles = await gitService.getStagedChanges();
      } else if (options.diff) {
        const parts = options.diff.split('..');
        if (parts.length === 2) {
          changedFiles = await gitService.getDiffChanges(parts[0], parts[1]);
        } else {
          changedFiles = await gitService.getDiffChanges(options.diff, 'HEAD');
        }
      } else {
        const staged = await gitService.getStagedChanges();
        const unstaged = await gitService.getUnstagedChanges();
        changedFiles = [...staged, ...unstaged];
      }

      if (changedFiles.length === 0) {
        console.log(chalk.yellow('No changes detected. Use --diff or --staged to specify changes.'));
        return;
      }

      // Analyze impact
      const analyzer = new ImpactAnalyzer(model);
      const report = analyzer.analyze(changedFiles);

      // Generate prompt pack
      const generator = new PromptPackGenerator({
        projectPath,
        provider: options.provider as 'claude' | 'openai' | 'generic',
        budget: parseInt(options.budget, 10),
        taskDescription: options.task,
        includeArchitecture: options.arch,
        includeContracts: options.contracts,
      });

      const pack = await generator.generate(report);

      // Format for provider
      const adapter = createAdapter(options.provider);
      const formatted = adapter.format(pack);

      // Output
      if (options.json) {
        console.log(JSON.stringify(pack.manifest, null, 2));
        return;
      }

      if (options.output) {
        const outputPath = options.output.endsWith(formatted.extension)
          ? options.output
          : options.output + formatted.extension;
        writeFileSync(outputPath, formatted.content);
        console.log(chalk.green(`✓ Prompt pack written to ${outputPath}`));
      }

      if (options.copy) {
        console.log(chalk.yellow('⚠ Clipboard support requires manual copy from output'));
      }

      // Print summary
      printSummary(pack, formatted.mimeType);

      // If no output specified, print the content
      if (!options.output && !options.copy) {
        console.log(chalk.dim('\n--- Content ---\n'));
        console.log(formatted.content);
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(formatError(error)));
        process.exit(exitCodeFor(error));
      }
      throw error;
    }
  });

function printSummary(
  pack: Awaited<ReturnType<PromptPackGenerator['generate']>>,
  mimeType: string
): void {
  const m = pack.manifest;

  console.log(chalk.bold('\n📦 Prompt Pack Summary\n'));
  console.log(`Provider: ${chalk.cyan(m.provider)}`);
  console.log(`Format: ${mimeType}`);
  console.log(`Hash: ${m.contentHash}`);

  console.log(chalk.cyan('\nTokens:'));
  console.log(`  Total: ${m.tokens.total.toLocaleString()} / ${m.tokens.budget.toLocaleString()}`);
  console.log(`  Utilization: ${(m.tokens.utilization * 100).toFixed(1)}%`);

  console.log(chalk.cyan('\nFiles:'));
  console.log(`  Changed: ${m.files.changed}`);
  console.log(`  Impacted: ${m.files.impacted}`);
  console.log(`  Included: ${m.files.included}`);
  if (m.files.redacted > 0) {
    console.log(chalk.yellow(`  Redacted: ${m.files.redacted}`));
  }

  if (m.components.names.length > 0) {
    console.log(chalk.cyan('\nComponents:'));
    console.log(`  ${m.components.names.join(', ')}`);
  }

  console.log('');
}

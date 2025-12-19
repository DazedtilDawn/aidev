import { Command, InvalidArgumentError } from 'commander';
import chalk from 'chalk';
import { loadProjectModel } from '../model/index.js';
import { GitService } from '../git/index.js';
import { ImpactAnalyzer } from '../impact/index.js';
import { exitCodeFor, formatError, GitError } from '../errors/index.js';
import { normalizePath } from '../utils/index.js';

interface ImpactOptions {
  diff?: string;
  staged?: boolean;
  file?: string;
  json?: boolean;
  minConfidence?: number;
}

function parsePercent(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new InvalidArgumentError(`--min-confidence must be a number from 0 to 100 (got "${value}")`);
  }
  return n;
}

export const impactCommand = new Command('impact')
  .description('Analyze impact of code changes')
  .option('--diff <ref>', 'Git diff reference (e.g., HEAD~1, HEAD~1..HEAD)')
  .option('--staged', 'Analyze staged changes')
  .option('--file <path>', 'Analyze specific file')
  .option('--json', 'Output as JSON')
  .option('--min-confidence <percent>', 'Filter impacts below confidence threshold (0-100)', parsePercent, 0)
  .action(async (options: ImpactOptions) => {
    try {
      const projectPath = process.cwd();

      // Load project model
      const model = await loadProjectModel(projectPath);

      // Get changed files
      const gitService = new GitService(projectPath);
      let changedFiles;

      if (options.file) {
        changedFiles = [{
          path: normalizePath(options.file),
          changeType: 'modified' as const,
        }];
      } else if (options.staged) {
        changedFiles = await gitService.getStagedChanges();
      } else if (options.diff) {
        // Parse diff reference
        const parts = options.diff.split('..');
        if (parts.length === 2) {
          changedFiles = await gitService.getDiffChanges(parts[0], parts[1]);
        } else {
          changedFiles = await gitService.getDiffChanges(options.diff, 'HEAD');
        }
      } else {
        // Default: staged + unstaged
        const staged = await gitService.getStagedChanges();
        const unstaged = await gitService.getUnstagedChanges();
        changedFiles = [...staged, ...unstaged];
      }

      if (changedFiles.length === 0) {
        console.log(chalk.yellow('No changes detected.'));
        return;
      }

      // Analyze impact
      const analyzer = new ImpactAnalyzer(model);
      let report = analyzer.analyze(changedFiles);

      // Apply confidence filter (uses best-edge-per-target semantics)
      const minConfidence = (options.minConfidence ?? 0) / 100;
      if (minConfidence > 0) {
        // Build map of strongest edge confidence per target file
        const changedPaths = new Set(changedFiles.map(f => normalizePath(f.path)));
        const bestByTarget = new Map<string, number>();
        for (const e of report.fileImpactEdges) {
          const prev = bestByTarget.get(e.target) ?? 0;
          if (e.confidence > prev) bestByTarget.set(e.target, e.confidence);
        }

        const filteredFileEdges = report.fileImpactEdges.filter(e => e.confidence >= minConfidence);
        // Include file if: it's a changed file OR its best edge meets threshold
        const filteredFiles = report.affectedFiles.filter(f =>
          changedPaths.has(normalizePath(f)) || (bestByTarget.get(f) ?? 0) >= minConfidence
        );
        const filteredImpactEdges = report.impactEdges.filter(e => e.confidence >= minConfidence);

        report = {
          ...report,
          affectedFiles: filteredFiles,
          fileImpactEdges: filteredFileEdges,
          impactEdges: filteredImpactEdges,
          summary: {
            ...report.summary,
            filesAffected: filteredFiles.length,
          },
        };
      }

      // Output
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printReport(report);
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(formatError(error)));
        process.exit(exitCodeFor(error));
      }
      throw error;
    }
  });

function printReport(report: ReturnType<ImpactAnalyzer['analyze']>): void {
  console.log(chalk.bold('\n📊 Impact Analysis Report\n'));

  // Summary
  console.log(chalk.cyan('Summary:'));
  console.log(`  Files changed: ${report.summary.filesChanged}`);
  console.log(`  Components affected: ${report.summary.componentsAffected}`);
  console.log(`  Files affected: ${report.summary.filesAffected}`);
  console.log(`  Mean confidence: ${(report.summary.confidenceMean * 100).toFixed(1)}%`);

  // Changed files
  if (report.changedFiles.length > 0) {
    console.log(chalk.cyan('\nChanged Files:'));
    for (const file of report.changedFiles) {
      const icon = file.changeType === 'added' ? '➕' :
                   file.changeType === 'deleted' ? '➖' :
                   file.changeType === 'renamed' ? '📝' : '✏️';
      console.log(`  ${icon} ${file.path}`);
    }
  }

  // Affected components
  if (report.affectedComponents.length > 0) {
    console.log(chalk.cyan('\nAffected Components:'));
    for (const comp of report.affectedComponents) {
      console.log(`  📦 ${comp}`);
    }
  }

  // Affected files (excluding changed files)
  const changedPaths = new Set(report.changedFiles.map(f => normalizePath(f.path)));
  const otherAffected = report.affectedFiles.filter(f => !changedPaths.has(normalizePath(f)));
  if (otherAffected.length > 0) {
    console.log(chalk.cyan('\nImpacted Files:'));
    for (const file of otherAffected.slice(0, 20)) {
      const edge = report.fileImpactEdges.find(e => e.target === file);
      const conf = edge ? `(${(edge.confidence * 100).toFixed(0)}%)` : '';
      console.log(`  📄 ${file} ${chalk.dim(conf)}`);
    }
    if (otherAffected.length > 20) {
      console.log(chalk.dim(`  ... and ${otherAffected.length - 20} more`));
    }
  }

  console.log('');
}

import { Command } from 'commander';
import chalk from 'chalk';
import { StateManager, estimateStateTokens } from '../state/index.js';
import { loadProjectModel } from '../model/index.js';
import { GitService } from '../git/index.js';
import { ImpactAnalyzer } from '../impact/index.js';
import { exitCodeFor, formatError } from '../errors/index.js';

interface StateOptions {
  // Display options
  json?: boolean;
  compact?: boolean;

  // Refresh facts
  refresh?: boolean;
  diff?: string;
  staged?: boolean;

  // Task context operations
  objective?: string;
  resolveObjective?: string;
  fact?: string;
  factSource?: string;
  question?: string;
  questionPriority?: 'high' | 'medium' | 'low';
  decide?: string;
  why?: string;
  constraint?: string;
  constraintType?: 'hard' | 'soft' | 'preference';
  next?: string;

  // Budget management
  prune?: boolean;
  budget?: string;

  // Reset
  reset?: boolean;
}

export const stateCommand = new Command('state')
  .description('Manage Internal State for long-horizon reasoning (MEM1-inspired)')
  .option('--json', 'Output as JSON')
  .option('--compact', 'Show compact summary only')
  .option('--refresh', 'Refresh code context from current changes')
  .option('--diff <ref>', 'Git diff reference for refresh')
  .option('--staged', 'Use staged changes for refresh')
  .option('--objective <goal>', 'Add an objective')
  .option('--resolve-objective <id>', 'Mark objective as resolved')
  .option('--fact <text>', 'Add a known fact')
  .option('--fact-source <source>', 'Source for the fact (default: user)')
  .option('--question <text>', 'Add an open question')
  .option('--question-priority <level>', 'Priority: high, medium, low')
  .option('--decide <what>', 'Record a decision')
  .option('--why <reason>', 'Reasoning for the decision')
  .option('--constraint <text>', 'Add a constraint')
  .option('--constraint-type <type>', 'Type: hard, soft, preference')
  .option('--next <action>', 'Set next intended action')
  .option('--prune', 'Prune reasoning layer to fit budget')
  .option('--budget <tokens>', 'Set token budget')
  .option('--reset', 'Reset state to fresh')
  .action(async (options: StateOptions) => {
    try {
      const projectPath = process.cwd();
      const manager = new StateManager({
        projectPath,
        maxTokens: options.budget ? parseInt(options.budget, 10) : undefined,
      });

      // Handle reset first
      if (options.reset) {
        await manager.reset();
        console.log(chalk.green('✓ State reset to fresh'));
        return;
      }

      // Handle refresh
      if (options.refresh) {
        await refreshCodeContext(manager, projectPath, options);
        console.log(chalk.green('✓ Code context refreshed'));
      }

      // Handle task context operations
      if (options.objective) {
        const obj = await manager.addObjective(options.objective);
        console.log(chalk.green(`✓ Objective added: ${obj.id.slice(0, 8)}`));
      }

      if (options.resolveObjective) {
        await manager.resolveObjective(options.resolveObjective);
        console.log(chalk.green('✓ Objective resolved'));
      }

      if (options.fact) {
        const fact = await manager.addKnownFact(
          options.fact,
          options.factSource ?? 'user',
          'likely'
        );
        console.log(chalk.green(`✓ Fact recorded: ${fact.id.slice(0, 8)}`));
      }

      if (options.question) {
        const q = await manager.addOpenQuestion(
          options.question,
          options.questionPriority ?? 'medium'
        );
        console.log(chalk.green(`✓ Question added: ${q.id.slice(0, 8)}`));
      }

      if (options.decide) {
        if (!options.why) {
          console.error(chalk.red('Error: --why is required with --decide'));
          process.exit(1);
        }
        const d = await manager.addDecision(options.decide, options.why);
        console.log(chalk.green(`✓ Decision recorded: ${d.id.slice(0, 8)}`));
      }

      if (options.constraint) {
        const c = await manager.addConstraint(
          options.constraint,
          options.constraintType ?? 'soft',
          'user'
        );
        console.log(chalk.green(`✓ Constraint added: ${c.id.slice(0, 8)}`));
      }

      if (options.next !== undefined) {
        await manager.setNextAction(options.next || null);
        console.log(chalk.green('✓ Next action updated'));
      }

      // Handle prune
      if (options.prune) {
        const result = await manager.prune();
        console.log(chalk.green(`✓ Pruned ${result.prunedItems} items`));
        console.log(chalk.dim(`  Tokens: ${result.tokensBefore} → ${result.tokensAfter}`));
      }

      // Display current state
      const state = await manager.getState();

      if (options.json) {
        console.log(JSON.stringify(state, null, 2));
      } else if (options.compact) {
        printCompactState(state);
      } else {
        printFullState(state);
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(formatError(error)));
        process.exit(exitCodeFor(error));
      }
      throw error;
    }
  });

async function refreshCodeContext(
  manager: StateManager,
  projectPath: string,
  options: StateOptions
): Promise<void> {
  const model = await loadProjectModel(projectPath);
  const gitService = new GitService(projectPath);

  let changedFiles;
  let gitRef: string | undefined;

  if (options.staged) {
    changedFiles = await gitService.getStagedChanges();
    gitRef = 'staged';
  } else if (options.diff) {
    const parts = options.diff.split('..');
    if (parts.length === 2) {
      changedFiles = await gitService.getDiffChanges(parts[0], parts[1]);
    } else {
      changedFiles = await gitService.getDiffChanges(options.diff, 'HEAD');
    }
    gitRef = options.diff;
  } else {
    // Default: staged + unstaged
    const staged = await gitService.getStagedChanges();
    const unstaged = await gitService.getUnstagedChanges();
    changedFiles = [...staged, ...unstaged];
    gitRef = 'working';
  }

  if (changedFiles.length === 0) {
    console.log(chalk.yellow('No changes detected, clearing code context'));
    await manager.clearCodeContext();
    return;
  }

  const analyzer = new ImpactAnalyzer(model);
  const report = analyzer.analyze(changedFiles);
  await manager.refreshCodeContext(report, gitRef);
}

function printCompactState(state: import('../schemas/state.js').InternalState): void {
  const tokens = estimateStateTokens(state);
  const budgetPct = Math.round((tokens / state.budget.maxTokens) * 100);

  console.log(chalk.bold('\n📊 Internal State Summary\n'));

  // Budget bar
  const barWidth = 30;
  const filledWidth = Math.min(barWidth, Math.round(barWidth * budgetPct / 100));
  const bar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);
  const budgetColor = budgetPct > 90 ? chalk.red : budgetPct > 70 ? chalk.yellow : chalk.green;
  console.log(`Budget: [${budgetColor(bar)}] ${budgetPct}%`);
  console.log(chalk.dim(`        ${tokens.toLocaleString()} / ${state.budget.maxTokens.toLocaleString()} tokens\n`));

  // Code context
  if (state.codeContext) {
    const cc = state.codeContext;
    console.log(chalk.cyan('Code Context:'));
    console.log(`  Changed: ${cc.summary.filesChanged} files`);
    console.log(`  Affected: ${cc.summary.componentsAffected} components, ${cc.summary.filesAffected} files`);
    console.log(`  Confidence: ${(cc.summary.confidenceMean * 100).toFixed(0)}%`);
    console.log(chalk.dim(`  As of: ${new Date(cc.asOf).toLocaleString()}`));
  } else {
    console.log(chalk.dim('Code Context: (not loaded)'));
  }

  // Task context
  const tc = state.taskContext;
  console.log(chalk.cyan('\nTask Context:'));
  console.log(`  Objectives: ${tc.objectives.filter(o => o.status === 'active').length} active`);
  console.log(`  Facts: ${tc.knownFacts.length} known`);
  console.log(`  Questions: ${tc.openQuestions.length} open`);
  console.log(`  Decisions: ${tc.decisions.length} made`);
  if (tc.nextAction) {
    console.log(chalk.yellow(`  Next: ${tc.nextAction}`));
  }
  console.log('');
}

function printFullState(state: import('../schemas/state.js').InternalState): void {
  const tokens = estimateStateTokens(state);
  const budgetPct = Math.round((tokens / state.budget.maxTokens) * 100);

  console.log(chalk.bold('\n🧠 Internal State <IS>\n'));

  // Budget
  const budgetColor = budgetPct > 90 ? chalk.red : budgetPct > 70 ? chalk.yellow : chalk.green;
  console.log(`Budget: ${budgetColor(`${budgetPct}%`)} (${tokens.toLocaleString()} / ${state.budget.maxTokens.toLocaleString()} tokens)`);
  console.log(chalk.dim(`Session: ${state.sessionId.slice(0, 8)}... | Updated: ${new Date(state.updatedAt).toLocaleString()}\n`));

  // === Code Context ===
  console.log(chalk.bold.cyan('═══ CODE CONTEXT (Facts Layer) ═══'));
  if (state.codeContext) {
    const cc = state.codeContext;
    console.log(chalk.dim(`Refreshed: ${new Date(cc.asOf).toLocaleString()} | Ref: ${cc.gitRef ?? 'unknown'}\n`));

    // Changed files
    if (cc.changedFiles.length > 0) {
      console.log(chalk.cyan('Changed Files:'));
      for (const file of cc.changedFiles.slice(0, 10)) {
        const icon = file.changeType === 'added' ? '➕' :
                     file.changeType === 'deleted' ? '➖' :
                     file.changeType === 'renamed' ? '📝' : '✏️';
        console.log(`  ${icon} ${file.path}`);
      }
      if (cc.changedFiles.length > 10) {
        console.log(chalk.dim(`  ... and ${cc.changedFiles.length - 10} more`));
      }
    }

    // Affected components
    if (cc.affectedComponents.length > 0) {
      console.log(chalk.cyan('\nAffected Components:'));
      for (const comp of cc.affectedComponents.slice(0, 10)) {
        console.log(`  📦 ${comp}`);
      }
      if (cc.affectedComponents.length > 10) {
        console.log(chalk.dim(`  ... and ${cc.affectedComponents.length - 10} more`));
      }
    }

    // Summary
    console.log(chalk.cyan('\nSummary:'));
    console.log(`  Files changed: ${cc.summary.filesChanged}`);
    console.log(`  Components affected: ${cc.summary.componentsAffected}`);
    console.log(`  Files affected: ${cc.summary.filesAffected}`);
    console.log(`  Mean confidence: ${(cc.summary.confidenceMean * 100).toFixed(1)}%`);
  } else {
    console.log(chalk.dim('(No code context loaded. Use --refresh to analyze changes.)\n'));
  }

  // === Task Context ===
  console.log(chalk.bold.magenta('\n═══ TASK CONTEXT (Reasoning Layer) ═══\n'));
  const tc = state.taskContext;

  // Objectives
  const activeObjectives = tc.objectives.filter(o => o.status === 'active');
  if (activeObjectives.length > 0) {
    console.log(chalk.magenta('Objectives:'));
    for (const obj of activeObjectives) {
      console.log(`  🎯 ${obj.goal}`);
      console.log(chalk.dim(`     ID: ${obj.id.slice(0, 8)} | Since: ${new Date(obj.createdAt).toLocaleDateString()}`));
    }
  }
  const resolvedCount = tc.objectives.filter(o => o.status === 'resolved').length;
  if (resolvedCount > 0) {
    console.log(chalk.dim(`  (${resolvedCount} resolved objectives)\n`));
  }

  // Known facts
  if (tc.knownFacts.length > 0) {
    console.log(chalk.magenta('Known Facts:'));
    for (const fact of tc.knownFacts.slice(-10)) {
      const conf = fact.confidence === 'certain' ? '✓' :
                   fact.confidence === 'likely' ? '~' : '?';
      console.log(`  ${conf} ${fact.fact}`);
      console.log(chalk.dim(`    Source: ${fact.source}`));
    }
    if (tc.knownFacts.length > 10) {
      console.log(chalk.dim(`  ... and ${tc.knownFacts.length - 10} earlier facts\n`));
    }
  }

  // Open questions
  if (tc.openQuestions.length > 0) {
    console.log(chalk.magenta('\nOpen Questions:'));
    for (const q of tc.openQuestions) {
      const priority = q.priority === 'high' ? chalk.red('!') :
                       q.priority === 'medium' ? chalk.yellow('?') : chalk.dim('?');
      console.log(`  ${priority} ${q.question}`);
    }
  }

  // Decisions
  if (tc.decisions.length > 0) {
    console.log(chalk.magenta('\nDecisions Made:'));
    for (const d of tc.decisions.slice(-5)) {
      console.log(`  ✓ ${d.what}`);
      console.log(chalk.dim(`    Why: ${d.why}`));
    }
    if (tc.decisions.length > 5) {
      console.log(chalk.dim(`  ... and ${tc.decisions.length - 5} earlier decisions`));
    }
  }

  // Constraints
  if (tc.constraints.length > 0) {
    console.log(chalk.magenta('\nConstraints:'));
    for (const c of tc.constraints) {
      const icon = c.type === 'hard' ? '🚫' : c.type === 'soft' ? '⚠️' : '💡';
      console.log(`  ${icon} ${c.constraint}`);
    }
  }

  // Next action
  if (tc.nextAction) {
    console.log(chalk.bold.yellow(`\n→ Next Action: ${tc.nextAction}`));
  }

  console.log('');
}

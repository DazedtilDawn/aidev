import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import {
  InternalState,
  CodeContext,
  TaskContext,
  Objective,
  KnownFact,
  OpenQuestion,
  Decision,
  Constraint,
  createEmptyInternalState,
  parseInternalState,
  estimateStateTokens,
} from '../schemas/state.js';
import { ImpactReport } from '../impact/analyzer.js';

const STATE_FILE = 'internal_state.yaml';
const SESSION_DIR = 'session';

export interface StateManagerOptions {
  projectPath: string;
  maxTokens?: number;
}

/**
 * StateManager - MEM1-inspired constant-memory state management
 *
 * Manages the Internal State <IS> with two layers:
 * - codeContext: Refreshable facts from AIDEV impact analysis
 * - taskContext: Accumulating reasoning that prunes by budget
 */
export class StateManager {
  private projectPath: string;
  private sessionPath: string;
  private stateFilePath: string;
  private maxTokens: number;
  private state: InternalState | null = null;

  constructor(options: StateManagerOptions) {
    this.projectPath = options.projectPath;
    this.sessionPath = join(options.projectPath, '.aidev', SESSION_DIR);
    this.stateFilePath = join(this.sessionPath, STATE_FILE);
    this.maxTokens = options.maxTokens ?? 50000;
  }

  /**
   * Load existing state or create fresh one
   */
  async load(): Promise<InternalState> {
    if (this.state !== null) {
      return this.state;
    }

    if (existsSync(this.stateFilePath)) {
      try {
        const content = readFileSync(this.stateFilePath, 'utf-8');
        const data = yaml.load(content);
        this.state = parseInternalState(data);
        return this.state;
      } catch (error) {
        // Corrupted state file - start fresh
        console.warn('Warning: Could not parse existing state, starting fresh');
      }
    }

    this.state = createEmptyInternalState();
    this.state.budget.maxTokens = this.maxTokens;
    return this.state;
  }

  /**
   * Save current state to disk
   */
  async save(): Promise<void> {
    if (!this.state) {
      throw new Error('No state to save. Call load() first.');
    }

    // Ensure session directory exists
    if (!existsSync(this.sessionPath)) {
      mkdirSync(this.sessionPath, { recursive: true });
    }

    // Update timestamp and token count
    this.state.updatedAt = new Date().toISOString();
    this.state.budget.currentTokens = estimateStateTokens(this.state);

    const content = yaml.dump(this.state, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    writeFileSync(this.stateFilePath, content, 'utf-8');
  }

  /**
   * Refresh code context from impact analysis
   * Replaces existing facts - they're always re-derivable from code
   */
  async refreshCodeContext(report: ImpactReport, gitRef?: string): Promise<void> {
    const state = await this.load();

    state.codeContext = {
      changedFiles: report.changedFiles.map(f => ({
        path: f.path,
        changeType: f.changeType,
        oldPath: f.oldPath,
      })),
      affectedComponents: report.affectedComponents,
      affectedFiles: report.affectedFiles,
      impactEdges: report.impactEdges.map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
        confidence: e.confidence,
        distance: e.distance,
        reason: e.reason,
        evidence: undefined, // Will be populated by --explain
      })),
      fileImpactEdges: report.fileImpactEdges.map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
        confidence: e.confidence,
        detection_method: e.detection_method,
        distance: e.distance,
        evidence: undefined, // Will be populated by scanner evidence
      })),
      summary: report.summary,
      asOf: new Date().toISOString(),
      gitRef,
    };

    await this.save();
  }

  /**
   * Clear code context (e.g., when starting fresh analysis)
   */
  async clearCodeContext(): Promise<void> {
    const state = await this.load();
    state.codeContext = null;
    await this.save();
  }

  // === Task Context Operations (MEM1 Reasoning Layer) ===

  /**
   * Add an objective
   */
  async addObjective(goal: string): Promise<Objective> {
    const state = await this.load();
    const objective: Objective = {
      id: crypto.randomUUID(),
      goal,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    state.taskContext.objectives.push(objective);
    await this.save();
    return objective;
  }

  /**
   * Resolve an objective
   */
  async resolveObjective(id: string): Promise<void> {
    const state = await this.load();
    const objective = state.taskContext.objectives.find(o => o.id === id);
    if (objective) {
      objective.status = 'resolved';
      objective.resolvedAt = new Date().toISOString();
      await this.save();
    }
  }

  /**
   * Record a known fact
   */
  async addKnownFact(
    fact: string,
    source: string,
    confidence: KnownFact['confidence'] = 'likely'
  ): Promise<KnownFact> {
    const state = await this.load();
    const knownFact: KnownFact = {
      id: crypto.randomUUID(),
      fact,
      source,
      confidence,
      learnedAt: new Date().toISOString(),
    };
    state.taskContext.knownFacts.push(knownFact);
    await this.save();
    return knownFact;
  }

  /**
   * Add an open question
   */
  async addOpenQuestion(
    question: string,
    priority: OpenQuestion['priority'] = 'medium',
    relatedObjective?: string
  ): Promise<OpenQuestion> {
    const state = await this.load();
    const openQuestion: OpenQuestion = {
      id: crypto.randomUUID(),
      question,
      priority,
      relatedObjective,
      createdAt: new Date().toISOString(),
    };
    state.taskContext.openQuestions.push(openQuestion);
    await this.save();
    return openQuestion;
  }

  /**
   * Remove a question (answered)
   */
  async removeQuestion(id: string): Promise<void> {
    const state = await this.load();
    state.taskContext.openQuestions = state.taskContext.openQuestions.filter(
      q => q.id !== id
    );
    await this.save();
  }

  /**
   * Record a decision with reasoning
   */
  async addDecision(
    what: string,
    why: string,
    alternatives?: string[],
    relatedObjective?: string
  ): Promise<Decision> {
    const state = await this.load();
    const decision: Decision = {
      id: crypto.randomUUID(),
      what,
      why,
      alternatives,
      relatedObjective,
      decidedAt: new Date().toISOString(),
    };
    state.taskContext.decisions.push(decision);
    await this.save();
    return decision;
  }

  /**
   * Add a constraint
   */
  async addConstraint(
    constraint: string,
    type: Constraint['type'],
    source: string
  ): Promise<Constraint> {
    const state = await this.load();
    const c: Constraint = {
      id: crypto.randomUUID(),
      constraint,
      type,
      source,
    };
    state.taskContext.constraints.push(c);
    await this.save();
    return c;
  }

  /**
   * Set next intended action
   */
  async setNextAction(action: string | null): Promise<void> {
    const state = await this.load();
    state.taskContext.nextAction = action;
    await this.save();
  }

  // === Budget Management (MEM1 Pruning) ===

  /**
   * Check if state is over budget
   */
  async isOverBudget(): Promise<boolean> {
    const state = await this.load();
    const currentTokens = estimateStateTokens(state);
    return currentTokens > state.budget.maxTokens;
  }

  /**
   * Prune reasoning layer to fit within budget
   * Uses MEM1 philosophy: taste-based pruning of older, lower-priority items
   */
  async prune(): Promise<{ prunedItems: number; tokensBefore: number; tokensAfter: number }> {
    const state = await this.load();
    const tokensBefore = estimateStateTokens(state);
    let prunedItems = 0;

    // Pruning order (least to most important):
    // 1. Resolved objectives (keep last 5)
    // 2. Older known facts (keep last 20)
    // 3. Low-priority questions (keep last 10)
    // 4. Older decisions (keep last 15)

    while (estimateStateTokens(state) > state.budget.maxTokens && prunedItems < 100) {
      const tc = state.taskContext;

      // Prune resolved objectives first
      const resolved = tc.objectives.filter(o => o.status === 'resolved');
      if (resolved.length > 5) {
        const oldest = resolved.sort(
          (a, b) => new Date(a.resolvedAt!).getTime() - new Date(b.resolvedAt!).getTime()
        )[0];
        tc.objectives = tc.objectives.filter(o => o.id !== oldest.id);
        prunedItems++;
        continue;
      }

      // Prune older known facts
      if (tc.knownFacts.length > 20) {
        const oldest = tc.knownFacts.sort(
          (a, b) => new Date(a.learnedAt).getTime() - new Date(b.learnedAt).getTime()
        )[0];
        tc.knownFacts = tc.knownFacts.filter(f => f.id !== oldest.id);
        prunedItems++;
        continue;
      }

      // Prune low-priority questions
      const lowPriority = tc.openQuestions.filter(q => q.priority === 'low');
      if (lowPriority.length > 0) {
        tc.openQuestions = tc.openQuestions.filter(q => q.id !== lowPriority[0].id);
        prunedItems++;
        continue;
      }
      if (tc.openQuestions.length > 10) {
        const oldest = tc.openQuestions.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];
        tc.openQuestions = tc.openQuestions.filter(q => q.id !== oldest.id);
        prunedItems++;
        continue;
      }

      // Prune older decisions
      if (tc.decisions.length > 15) {
        const oldest = tc.decisions.sort(
          (a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime()
        )[0];
        tc.decisions = tc.decisions.filter(d => d.id !== oldest.id);
        prunedItems++;
        continue;
      }

      // Nothing more to prune
      break;
    }

    state.budget.lastPruned = new Date().toISOString();
    state.budget.currentTokens = estimateStateTokens(state);
    await this.save();

    return {
      prunedItems,
      tokensBefore,
      tokensAfter: state.budget.currentTokens,
    };
  }

  /**
   * Get current state (read-only snapshot)
   */
  async getState(): Promise<InternalState> {
    return await this.load();
  }

  /**
   * Reset state to fresh
   */
  async reset(): Promise<void> {
    this.state = createEmptyInternalState();
    this.state.budget.maxTokens = this.maxTokens;
    await this.save();
  }

  /**
   * Check if state file exists
   */
  exists(): boolean {
    return existsSync(this.stateFilePath);
  }
}

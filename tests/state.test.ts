import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { StateManager } from '../src/state/manager.js';
import {
  createEmptyInternalState,
  estimateStateTokens,
  parseInternalState,
} from '../src/schemas/state.js';

const TEST_DIR = 'C:\\dev\\AIDEV\\tests\\fixtures\\state-test';

describe('Internal State Schema', () => {
  it('creates empty state with correct structure', () => {
    const state = createEmptyInternalState('test-session');

    expect(state.version).toBe('1.0.0');
    expect(state.codeContext).toBeNull();
    expect(state.taskContext.objectives).toHaveLength(0);
    expect(state.taskContext.knownFacts).toHaveLength(0);
    expect(state.taskContext.openQuestions).toHaveLength(0);
    expect(state.taskContext.decisions).toHaveLength(0);
    expect(state.taskContext.constraints).toHaveLength(0);
    expect(state.taskContext.nextAction).toBeNull();
    expect(state.sessionId).toBe('test-session');
  });

  it('estimates tokens for state', () => {
    const state = createEmptyInternalState();
    const tokens = estimateStateTokens(state);

    // Empty state should be small
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(500);
  });

  it('validates state schema', () => {
    const validState = createEmptyInternalState();
    expect(() => parseInternalState(validState)).not.toThrow();
  });

  it('rejects invalid state', () => {
    const invalidState = {
      version: '2.0.0', // Wrong version
      codeContext: null,
      taskContext: {},
    };
    expect(() => parseInternalState(invalidState)).toThrow();
  });
});

describe('StateManager', () => {
  let manager: StateManager;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    manager = new StateManager({ projectPath: TEST_DIR });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('load/save', () => {
    it('creates fresh state when none exists', async () => {
      const state = await manager.load();

      expect(state.version).toBe('1.0.0');
      expect(state.codeContext).toBeNull();
    });

    it('saves and loads state', async () => {
      await manager.load();
      await manager.addObjective('Test objective');
      await manager.save();

      // Create new manager to force reload from disk
      const manager2 = new StateManager({ projectPath: TEST_DIR });
      const state = await manager2.load();

      expect(state.taskContext.objectives).toHaveLength(1);
      expect(state.taskContext.objectives[0].goal).toBe('Test objective');
    });

    it('creates session directory', async () => {
      await manager.load();
      await manager.save();

      expect(existsSync(join(TEST_DIR, '.aidev', 'session'))).toBe(true);
    });
  });

  describe('objectives', () => {
    it('adds objective', async () => {
      const obj = await manager.addObjective('Fix authentication bug');

      expect(obj.goal).toBe('Fix authentication bug');
      expect(obj.status).toBe('active');
      expect(obj.id).toBeDefined();
    });

    it('resolves objective', async () => {
      const obj = await manager.addObjective('Test objective');
      await manager.resolveObjective(obj.id);

      const state = await manager.getState();
      const resolved = state.taskContext.objectives.find(o => o.id === obj.id);

      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolvedAt).toBeDefined();
    });
  });

  describe('known facts', () => {
    it('adds known fact', async () => {
      const fact = await manager.addKnownFact(
        'The auth module uses JWT tokens',
        'code review',
        'certain'
      );

      expect(fact.fact).toBe('The auth module uses JWT tokens');
      expect(fact.source).toBe('code review');
      expect(fact.confidence).toBe('certain');
    });
  });

  describe('open questions', () => {
    it('adds and removes question', async () => {
      const q = await manager.addOpenQuestion(
        'Why is the test failing?',
        'high'
      );

      expect(q.question).toBe('Why is the test failing?');
      expect(q.priority).toBe('high');

      await manager.removeQuestion(q.id);
      const state = await manager.getState();

      expect(state.taskContext.openQuestions).toHaveLength(0);
    });
  });

  describe('decisions', () => {
    it('records decision with reasoning', async () => {
      const d = await manager.addDecision(
        'Use passport-jwt for authentication',
        'Already in dependencies, team is familiar with it',
        ['express-jwt', 'jsonwebtoken direct']
      );

      expect(d.what).toBe('Use passport-jwt for authentication');
      expect(d.why).toBe('Already in dependencies, team is familiar with it');
      expect(d.alternatives).toEqual(['express-jwt', 'jsonwebtoken direct']);
    });
  });

  describe('constraints', () => {
    it('adds constraint', async () => {
      const c = await manager.addConstraint(
        'Must support Node 18+',
        'hard',
        'package.json'
      );

      expect(c.constraint).toBe('Must support Node 18+');
      expect(c.type).toBe('hard');
    });
  });

  describe('next action', () => {
    it('sets and clears next action', async () => {
      await manager.setNextAction('Run the test suite');
      let state = await manager.getState();
      expect(state.taskContext.nextAction).toBe('Run the test suite');

      await manager.setNextAction(null);
      state = await manager.getState();
      expect(state.taskContext.nextAction).toBeNull();
    });
  });

  describe('budget management', () => {
    it('tracks token budget', async () => {
      const state = await manager.load();
      expect(state.budget.maxTokens).toBe(50000);
      expect(state.budget.currentTokens).toBeGreaterThanOrEqual(0);
    });

    it('prunes when over budget', async () => {
      // Add many items to exceed budget
      for (let i = 0; i < 30; i++) {
        await manager.addKnownFact(`Fact ${i}`, 'test', 'likely');
      }

      // Force small budget
      const state = await manager.load();
      state.budget.maxTokens = 1000;
      await manager.save();

      const result = await manager.prune();

      expect(result.prunedItems).toBeGreaterThan(0);
      expect(result.tokensAfter).toBeLessThanOrEqual(result.tokensBefore);
    });
  });

  describe('reset', () => {
    it('resets state to fresh', async () => {
      await manager.addObjective('Test objective');
      await manager.addKnownFact('Test fact', 'test', 'likely');
      await manager.reset();

      const state = await manager.getState();

      expect(state.taskContext.objectives).toHaveLength(0);
      expect(state.taskContext.knownFacts).toHaveLength(0);
    });
  });
});

describe('MEM1 Workflow', () => {
  let manager: StateManager;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    manager = new StateManager({ projectPath: TEST_DIR });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('supports full MEM1-style reasoning workflow', async () => {
    // Turn 1: Start with an objective
    await manager.addObjective('Fix the authentication bug in login flow');
    await manager.addConstraint('Must not break existing sessions', 'hard', 'user');
    await manager.setNextAction('Investigate auth.ts for the bug');

    // Turn 2: After investigation
    await manager.addKnownFact(
      'The bug is in the token validation - expiry check is wrong',
      'src/auth.ts:47',
      'certain'
    );
    await manager.addDecision(
      'Fix the expiry comparison operator',
      'Token expiry was using > instead of < for comparison',
      ['Rewrite token validation', 'Add middleware wrapper']
    );
    await manager.setNextAction('Apply the fix and run tests');

    // Turn 3: After fix
    await manager.addKnownFact('All 191 tests pass after fix', 'test output', 'certain');
    await manager.resolveObjective(
      (await manager.getState()).taskContext.objectives[0].id
    );
    await manager.setNextAction(null);

    // Verify final state
    const state = await manager.getState();

    expect(state.taskContext.objectives[0].status).toBe('resolved');
    expect(state.taskContext.knownFacts).toHaveLength(2);
    expect(state.taskContext.decisions).toHaveLength(1);
    expect(state.taskContext.constraints).toHaveLength(1);
    expect(state.taskContext.nextAction).toBeNull();

    // Verify the reasoning trail is preserved
    const decision = state.taskContext.decisions[0];
    expect(decision.what).toContain('expiry');
    expect(decision.why).toContain('> instead of <');
  });
});

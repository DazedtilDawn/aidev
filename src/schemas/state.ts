import { z } from 'zod';

/**
 * Internal State Schema - MEM1-inspired constant-memory reasoning
 *
 * Two layers:
 * - codeContext: AIDEV facts (objective, refreshable from code)
 * - taskContext: MEM1 reasoning (subjective, accumulating)
 *
 * Facts refresh on demand. Reasoning persists and prunes by budget.
 */

// === Code Context: AIDEV Facts Layer ===

export const ChangedFileStateSchema = z.object({
  path: z.string(),
  changeType: z.enum(['added', 'modified', 'deleted', 'renamed']),
  oldPath: z.string().optional(),
});

export const ImpactEdgeStateSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum(['direct', 'transitive']),
  confidence: z.number().min(0).max(1),
  distance: z.number().int().min(0),
  reason: z.string(),
  // Evidence trail - the "why" behind the impact
  evidence: z.object({
    sourceLocation: z.string().optional(),  // e.g., "line 47"
    targetLocation: z.string().optional(),  // e.g., "line 12"
    symbol: z.string().optional(),          // e.g., "validateToken"
    edgeType: z.string().optional(),        // e.g., "import"
  }).optional(),
});

export const FileImpactEdgeStateSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.string(),
  confidence: z.number().min(0).max(1),
  detection_method: z.enum(['declared', 'ast', 'regex', 'heuristic']),
  distance: z.number().int().min(0),
  // Evidence trail
  evidence: z.object({
    importStatement: z.string().optional(),  // The actual import line
    lineNumber: z.number().optional(),       // Where the import is
    symbols: z.array(z.string()).optional(), // What symbols are imported
  }).optional(),
});

export const CodeContextSchema = z.object({
  changedFiles: z.array(ChangedFileStateSchema),
  affectedComponents: z.array(z.string()),
  affectedFiles: z.array(z.string()),
  impactEdges: z.array(ImpactEdgeStateSchema),
  fileImpactEdges: z.array(FileImpactEdgeStateSchema),
  summary: z.object({
    filesChanged: z.number().int().min(0),
    componentsAffected: z.number().int().min(0),
    filesAffected: z.number().int().min(0),
    confidenceMean: z.number().min(0).max(1),
  }),
  // When these facts were computed
  asOf: z.string().datetime(),
  // Git ref at time of analysis (for staleness detection)
  gitRef: z.string().optional(),
});

// === Task Context: MEM1 Reasoning Layer ===

export const ObjectiveSchema = z.object({
  id: z.string(),
  goal: z.string(),
  status: z.enum(['active', 'resolved', 'blocked', 'deferred']),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
});

export const KnownFactSchema = z.object({
  id: z.string(),
  fact: z.string(),
  source: z.string(),  // Where this was learned (file, tool output, user)
  confidence: z.enum(['certain', 'likely', 'uncertain']),
  learnedAt: z.string().datetime(),
});

export const OpenQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  relatedObjective: z.string().optional(),  // Links to ObjectiveSchema.id
  createdAt: z.string().datetime(),
});

export const DecisionSchema = z.object({
  id: z.string(),
  what: z.string(),   // What was decided
  why: z.string(),    // The reasoning
  alternatives: z.array(z.string()).optional(),  // What was considered
  relatedObjective: z.string().optional(),
  decidedAt: z.string().datetime(),
});

export const ConstraintSchema = z.object({
  id: z.string(),
  constraint: z.string(),
  type: z.enum(['hard', 'soft', 'preference']),
  source: z.string(),  // Where this constraint comes from
});

export const TaskContextSchema = z.object({
  objectives: z.array(ObjectiveSchema),
  knownFacts: z.array(KnownFactSchema),
  openQuestions: z.array(OpenQuestionSchema),
  constraints: z.array(ConstraintSchema),
  decisions: z.array(DecisionSchema),
  nextAction: z.string().nullable(),
});

// === Internal State: The Complete <IS> ===

export const InternalStateSchema = z.object({
  version: z.literal('1.0.0'),

  // AIDEV facts layer - refreshable from code
  codeContext: CodeContextSchema.nullable(),

  // MEM1 reasoning layer - accumulating
  taskContext: TaskContextSchema,

  // Memory budget management
  budget: z.object({
    maxTokens: z.number().int().positive(),
    currentTokens: z.number().int().min(0),
    lastPruned: z.string().datetime().optional(),
  }),

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sessionId: z.string(),
});

export type ChangedFileState = z.infer<typeof ChangedFileStateSchema>;
export type ImpactEdgeState = z.infer<typeof ImpactEdgeStateSchema>;
export type FileImpactEdgeState = z.infer<typeof FileImpactEdgeStateSchema>;
export type CodeContext = z.infer<typeof CodeContextSchema>;
export type Objective = z.infer<typeof ObjectiveSchema>;
export type KnownFact = z.infer<typeof KnownFactSchema>;
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
export type TaskContext = z.infer<typeof TaskContextSchema>;
export type InternalState = z.infer<typeof InternalStateSchema>;

export function parseInternalState(data: unknown): InternalState {
  return InternalStateSchema.parse(data);
}

/**
 * Create a fresh Internal State with empty contexts
 */
export function createEmptyInternalState(sessionId?: string): InternalState {
  const now = new Date().toISOString();
  return {
    version: '1.0.0',
    codeContext: null,
    taskContext: {
      objectives: [],
      knownFacts: [],
      openQuestions: [],
      constraints: [],
      decisions: [],
      nextAction: null,
    },
    budget: {
      maxTokens: 50000,  // Default budget
      currentTokens: 0,
      lastPruned: undefined,
    },
    createdAt: now,
    updatedAt: now,
    sessionId: sessionId ?? crypto.randomUUID(),
  };
}

/**
 * Estimate token count for Internal State (conservative)
 */
export function estimateStateTokens(state: InternalState): number {
  const json = JSON.stringify(state);
  // Conservative estimate: ~3.5 chars per token + 10% buffer
  return Math.ceil((json.length / 3.5) * 1.1);
}

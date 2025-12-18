import { z } from 'zod';

export const EdgeTypeEnum = z.enum([
  'import', 'call', 'type_reference', 'extends',
  'uses_table', 'publishes_event', 'calls_endpoint',
  'reads_config', 'test_covers'
]);

export const DetectionMethodEnum = z.enum([
  'declared', 'ast', 'regex', 'heuristic'
]);

export const EdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: EdgeTypeEnum,
  confidence: z.number().min(0).max(1),
  detection_method: DetectionMethodEnum.default('declared'),
  evidence: z.string().optional(),
  last_verified: z.string().datetime().optional(),
});

export type Edge = z.infer<typeof EdgeSchema>;

export function parseEdge(data: unknown): Edge {
  return EdgeSchema.parse(data);
}

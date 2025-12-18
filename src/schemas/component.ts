import { z } from 'zod';

export const ComponentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  paths: z.array(z.string()).min(1),
  depends_on: z.array(z.string()).default([]),
  contracts: z.array(z.string()).default([]),
});

export type Component = z.infer<typeof ComponentSchema>;

export function parseComponent(data: unknown): Component {
  return ComponentSchema.parse(data);
}

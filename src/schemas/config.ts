import { z } from 'zod';

export const ConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  scan: z.object({
    exclude: z.array(z.string()).default(['node_modules/', 'dist/', 'vendor/']),
    max_files: z.number().default(10000),
  }).default({}),
  providers: z.object({
    default: z.string().default('claude'),
    token_budgets: z.record(z.number()).default({
      claude: 100000,
      openai: 100000,
    }),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

export function parseConfig(data: unknown): Config {
  return ConfigSchema.parse(data);
}

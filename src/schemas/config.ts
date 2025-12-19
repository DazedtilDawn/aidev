import { z } from 'zod';

const ScanConfigSchema = z.object({
  exclude: z.array(z.string()).default(['node_modules/', 'dist/', 'vendor/']),
  max_files: z.number().default(10000),
});

const ProvidersConfigSchema = z.object({
  default: z.string().default('claude'),
  token_budgets: z.record(z.string(), z.number()).default({
    claude: 100000,
    openai: 100000,
  }),
});

export const ConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  scan: ScanConfigSchema.default({
    exclude: ['node_modules/', 'dist/', 'vendor/'],
    max_files: 10000,
  }),
  providers: ProvidersConfigSchema.default({
    default: 'claude',
    token_budgets: { claude: 100000, openai: 100000 },
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export function parseConfig(data: unknown): Config {
  return ConfigSchema.parse(data);
}

import { Command } from 'commander';

export const syncCommand = new Command('sync')
  .description('Sync project model with codebase')
  .option('--check', 'Check for drift without fixing')
  .option('--fix', 'Auto-fix simple drift')
  .action((options) => {
    console.log('Model sync:', options);
  });

import { Command } from 'commander';

export const promptCommand = new Command('prompt')
  .description('Generate prompt pack for AI assistants')
  .option('--provider <name>', 'Target provider (claude, openai)', 'claude')
  .option('--budget <tokens>', 'Token budget', '100000')
  .option('--copy', 'Copy to clipboard')
  .action((options) => {
    console.log('Prompt generation:', options);
  });

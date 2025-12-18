import { Command } from 'commander';

export const impactCommand = new Command('impact')
  .description('Analyze impact of code changes')
  .option('--diff <ref>', 'Git diff reference (e.g., HEAD~1..HEAD)')
  .option('--staged', 'Analyze staged changes')
  .option('--file <path>', 'Analyze specific file')
  .action((options) => {
    console.log('Impact analysis:', options);
  });

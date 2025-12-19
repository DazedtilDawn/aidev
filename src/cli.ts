#!/usr/bin/env node
import { Command } from 'commander';
import { impactCommand } from './commands/impact.js';
import { promptCommand } from './commands/prompt.js';
import { syncCommand } from './commands/sync.js';
import { initCommand } from './commands/init.js';
import { stateCommand } from './commands/state.js';

const program = new Command();

program
  .name('aidev')
  .description('AI-assisted development context generator')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(impactCommand);
program.addCommand(promptCommand);
program.addCommand(syncCommand);
program.addCommand(stateCommand);

program.parse();

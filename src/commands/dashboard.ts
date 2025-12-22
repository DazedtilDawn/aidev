import { Command } from 'commander';
import chalk from 'chalk';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = join(__dirname, '..', 'server', 'index.ts');

export const dashboardCommand = new Command('dashboard')
  .description('Launch the Mission Control visual dashboard')
  .action(async () => {
    console.log(chalk.bold('\n🚀 Launching Mission Control...\n'));

    // Start the headless server using tsx
    const serverProcess = spawn('npx', ['tsx', SERVER_PATH], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '3001' }
    });

    console.log(chalk.cyan('API Server: http://localhost:3001'));
    console.log(chalk.green('Dashboard:  (Run "npm run dev" in src/dashboard to start the UI)'));
    
    console.log(chalk.dim('\nPress Ctrl+C to stop the server.\n'));

    process.on('SIGINT', () => {
      serverProcess.kill();
      process.exit();
    });
  });

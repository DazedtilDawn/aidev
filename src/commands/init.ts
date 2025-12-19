import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

interface InitOptions {
  force?: boolean;
}

/**
 * Helper to create directory with error handling
 */
function ensureDirectory(dirPath: string, displayName: string): boolean {
  try {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      console.log(chalk.gray(`  Created ${displayName}/`));
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`  Failed to create ${displayName}/: ${message}`));
    return false;
  }
}

/**
 * Helper to write file with error handling
 */
function writeConfigFile(filePath: string, content: string, displayName: string): boolean {
  try {
    writeFileSync(filePath, content);
    console.log(chalk.gray(`  Created ${displayName}`));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`  Failed to create ${displayName}: ${message}`));
    return false;
  }
}

const DEFAULT_CONFIG = {
  version: '1.0.0',
  scan: {
    exclude: ['node_modules/', 'dist/', 'vendor/', '.git/', 'coverage/'],
    max_files: 10000,
  },
  providers: {
    default: 'claude',
    token_budgets: {
      claude: 100000,
      openai: 100000,
    },
  },
};

const EXAMPLE_COMPONENT = {
  name: 'example-component',
  description: 'Example component - replace with your actual component',
  paths: ['src/example/**'],
  depends_on: [],
  contracts: [],
};

export const initCommand = new Command('init')
  .description('Initialize AIDEV in current directory')
  .option('--force', 'Overwrite existing .aidev directory')
  .action(async (options: InitOptions) => {
    const projectPath = process.cwd();
    const aidevPath = join(projectPath, '.aidev');

    if (existsSync(aidevPath) && !options.force) {
      console.error(chalk.red('Error: .aidev directory already exists. Use --force to overwrite.'));
      process.exit(1);
    }

    console.log(chalk.blue('Initializing AIDEV...'));

    let hasErrors = false;

    // Create directory structure
    const dirs = [
      '.aidev',
      '.aidev/model',
      '.aidev/model/components',
      '.aidev/model/graph',
      '.aidev/cache',
    ];

    for (const dir of dirs) {
      const dirPath = join(projectPath, dir);
      if (!ensureDirectory(dirPath, dir)) {
        hasErrors = true;
      }
    }

    // Stop early if directory creation failed
    if (hasErrors) {
      console.error(chalk.red('\n✗ Failed to create directory structure. Aborting.'));
      process.exit(1);
    }

    // Create config.yaml
    const configPath = join(aidevPath, 'config.yaml');
    if (!writeConfigFile(configPath, yaml.dump(DEFAULT_CONFIG, { lineWidth: 80 }), '.aidev/config.yaml')) {
      hasErrors = true;
    }

    // Create example component
    const exampleComponentPath = join(aidevPath, 'model', 'components', '_example.yaml');
    if (!writeConfigFile(exampleComponentPath, yaml.dump(EXAMPLE_COMPONENT, { lineWidth: 80 }), '.aidev/model/components/_example.yaml')) {
      hasErrors = true;
    }

    // Create empty declared_edges.yaml
    const declaredEdgesPath = join(aidevPath, 'model', 'graph', 'declared_edges.yaml');
    if (!writeConfigFile(declaredEdgesPath, yaml.dump({ edges: [] }, { lineWidth: 80 }), '.aidev/model/graph/declared_edges.yaml')) {
      hasErrors = true;
    }

    // Create empty discovered_edges.yaml
    const discoveredEdgesPath = join(aidevPath, 'model', 'graph', 'discovered_edges.yaml');
    if (!writeConfigFile(discoveredEdgesPath, yaml.dump({ edges: [], last_sync: null }, { lineWidth: 80 }), '.aidev/model/graph/discovered_edges.yaml')) {
      hasErrors = true;
    }

    // Create .gitignore for cache
    const gitignorePath = join(aidevPath, '.gitignore');
    if (!writeConfigFile(gitignorePath, 'cache/\n', '.aidev/.gitignore')) {
      hasErrors = true;
    }

    if (hasErrors) {
      console.error(chalk.yellow('\n⚠ AIDEV initialized with some errors. Please check the messages above.'));
      process.exit(1);
    }

    console.log(chalk.green('\n✓ AIDEV initialized successfully!'));
    console.log(chalk.cyan('\nNext steps:'));
    console.log('  1. Edit .aidev/model/components/_example.yaml (rename and configure)');
    console.log('  2. Run `aidev sync` to discover dependencies');
    console.log('  3. Run `aidev impact --staged` to analyze changes');
    console.log('  4. Run `aidev prompt --staged` to generate prompt packs');
  });

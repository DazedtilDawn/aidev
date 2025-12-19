import { Command } from 'commander';
import chalk from 'chalk';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import yaml from 'js-yaml';
import { loadProjectModel } from '../model/index.js';
import { TypeScriptScanner } from '../scanners/typescript.js';
import { PythonScanner } from '../scanners/python.js';
import { GraphBuilder } from '../graph/index.js';
import { exitCodeFor, formatError } from '../errors/index.js';
import { normalizePath } from '../utils/index.js';

interface SyncOptions {
  check?: boolean;
  fix?: boolean;
  verbose?: boolean;
}

export const syncCommand = new Command('sync')
  .description('Sync project model with codebase (discover dependencies)')
  .option('--check', 'Check for drift without fixing')
  .option('--fix', 'Auto-update discovered_edges.yaml')
  .option('--verbose', 'Show detailed output')
  .action(async (options: SyncOptions) => {
    try {
      const projectPath = process.cwd();
      const aidevPath = join(projectPath, '.aidev');

      // Load existing model
      const model = await loadProjectModel(projectPath);

      if (model.components.length === 0 && !existsSync(aidevPath)) {
        console.log(chalk.yellow('No .aidev directory found. Run `aidev init` first.'));
        return;
      }

      console.log(chalk.cyan('🔍 Scanning codebase...\n'));

      // Get scanner configuration
      const excludePatterns = model.config.scan.exclude;
      const maxFiles = model.config.scan.max_files;

      // Discover files and scan them
      const tsScanner = new TypeScriptScanner();
      const pyScanner = new PythonScanner();
      const graphBuilder = new GraphBuilder();

      let filesScanned = 0;
      let totalFiles = 0;
      let maxFilesReached = false;

      const scanDir = (dir: string, depth = 0): void => {
        if (depth > 20 || maxFilesReached) return; // Prevent infinite recursion and respect max_files

        let entries;
        try {
          entries = readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          if (maxFilesReached) return; // Check before processing each entry

          const fullPath = join(dir, entry.name);
          const relativePath = normalizePath(fullPath.replace(projectPath, '').replace(/^[\/\\]/, ''));

          // Check exclusions
          if (excludePatterns.some(pattern => {
            if (pattern.endsWith('/')) {
              return relativePath.startsWith(pattern) || relativePath.includes('/' + pattern);
            }
            return relativePath.includes(pattern);
          })) {
            continue;
          }

          if (entry.isDirectory()) {
            scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            totalFiles++;
            if (totalFiles > maxFiles) {
              maxFilesReached = true;
              return;
            }

            const ext = extname(entry.name);

            // Scan TypeScript/JavaScript files
            if (tsScanner.extensions.includes(ext)) {
              try {
                const content = readFileSync(fullPath, 'utf-8');
                const result = tsScanner.scan(relativePath, content);
                graphBuilder.addScanResult(relativePath, result);
                filesScanned++;
                if (options.verbose) {
                  console.log(chalk.dim(`  Scanned: ${relativePath}`));
                }
              } catch {
                // Skip unreadable files
              }
            }

            // Scan Python files
            if (pyScanner.extensions.includes(ext)) {
              try {
                const content = readFileSync(fullPath, 'utf-8');
                const result = pyScanner.scan(relativePath, content);
                graphBuilder.addScanResult(relativePath, result);
                filesScanned++;
                if (options.verbose) {
                  console.log(chalk.dim(`  Scanned: ${relativePath}`));
                }
              } catch {
                // Skip unreadable files
              }
            }
          }
        }
      };

      scanDir(projectPath);

      // Build edges
      const discoveredEdges = graphBuilder.buildEdges();

      console.log(`Files scanned: ${filesScanned}`);
      console.log(`Edges discovered: ${discoveredEdges.length}`);

      // Compare with existing discovered edges (semantic comparison, not just count)
      const serializeEdge = (e: typeof discoveredEdges[0]) =>
        `${e.source}|${e.target}|${e.type}|${e.confidence}`;

      const existingSet = new Set(model.discoveredEdges.map(serializeEdge));
      const newSet = new Set(discoveredEdges.map(serializeEdge));

      const added = discoveredEdges.filter(e => !existingSet.has(serializeEdge(e)));
      const removed = model.discoveredEdges.filter(e => !newSet.has(serializeEdge(e)));
      const hasDrift = added.length > 0 || removed.length > 0;

      if (hasDrift) {
        console.log(chalk.yellow(`\nDrift detected:`));
        if (added.length > 0) console.log(chalk.green(`  +${added.length} new edges`));
        if (removed.length > 0) console.log(chalk.red(`  -${removed.length} removed edges`));
      } else {
        console.log(chalk.green('\n✓ Model is in sync'));
      }

      // Check mode - just report
      if (options.check) {
        if (hasDrift) {
          console.log(chalk.yellow('\nRun with --fix to update discovered_edges.yaml'));
          process.exit(1);
        }
        return;
      }

      // Fix mode - update file
      if (options.fix || hasDrift) {
        const graphDir = join(aidevPath, 'model', 'graph');
        if (!existsSync(graphDir)) {
          mkdirSync(graphDir, { recursive: true });
        }

        const edgesPath = join(graphDir, 'discovered_edges.yaml');
        const edgesYaml = yaml.dump({
          version: '1.0.0',
          generated: new Date().toISOString(),
          edges: discoveredEdges,
        });

        writeFileSync(edgesPath, edgesYaml);
        console.log(chalk.green(`✓ Updated ${edgesPath}`));
      }

      // Summary
      if (options.verbose && discoveredEdges.length > 0) {
        console.log(chalk.cyan('\nSample edges:'));
        for (const edge of discoveredEdges.slice(0, 10)) {
          console.log(`  ${edge.source} → ${edge.target} (${edge.type})`);
        }
        if (discoveredEdges.length > 10) {
          console.log(chalk.dim(`  ... and ${discoveredEdges.length - 10} more`));
        }
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(formatError(error)));
        process.exit(exitCodeFor(error));
      }
      throw error;
    }
  });

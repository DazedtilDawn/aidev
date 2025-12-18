import simpleGit, { SimpleGit } from 'simple-git';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseDiffOutput, ChangedFile } from './diff-parser.js';

export class GitService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async getStagedChanges(): Promise<ChangedFile[]> {
    const output = await this.git.diff(['--cached', '--name-status']);
    return parseDiffOutput(output);
  }

  async getUnstagedChanges(): Promise<ChangedFile[]> {
    const output = await this.git.diff(['--name-status']);
    return parseDiffOutput(output);
  }

  async getDiffChanges(fromRef: string, toRef: string): Promise<ChangedFile[]> {
    const output = await this.git.diff([fromRef, toRef, '--name-status']);
    return parseDiffOutput(output);
  }

  async getFileContent(path: string, ref?: string): Promise<string> {
    if (ref) {
      return this.git.show([`${ref}:${path}`]);
    }
    const repoRoot = await this.getRepoRoot();
    return readFileSync(join(repoRoot, path), 'utf-8');
  }

  async getRepoRoot(): Promise<string> {
    return (await this.git.revparse(['--show-toplevel'])).trim();
  }

  async getCurrentBranch(): Promise<string> {
    return (await this.git.revparse(['--abbrev-ref', 'HEAD'])).trim();
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }
}

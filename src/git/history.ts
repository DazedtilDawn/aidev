import { SimpleGit, simpleGit } from 'simple-git';

export interface DiffStat {
  insertions: number;
  deletions: number;
  files: number;
}

export interface CommitInfo {
  hash: string;
  date: string;
  author: string;
  message: string;
  body: string;
  files: string[];
  diffStat?: DiffStat;
}

export class GitHistoryService {
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Get recent commits that touched any of the provided files.
   * @param filePaths - List of files to check history for
   * @param limit - Max commits to retrieve (default 10)
   * @param since - Optional date string (e.g. "1 month ago")
   */
  async getRecentCommits(filePaths: string[], limit: number = 10, since?: string): Promise<CommitInfo[]> {
    if (filePaths.length === 0) return [];

    const options: Record<string, unknown> = {
      file: filePaths,
      '--max-count': limit,
      '--no-merges': null,
      '--stat': null,
    };

    if (since) {
      options['--since'] = since;
    }

    try {
      const log = await this.git.log(options);

      const commits: CommitInfo[] = [];
      for (const commit of log.all) {
        // Get files changed in this commit
        const files = await this.getCommitFiles(commit.hash);
        const diffStat = await this.getCommitDiffStat(commit.hash);

        commits.push({
          hash: commit.hash,
          date: commit.date,
          author: commit.author_name,
          message: commit.message,
          body: commit.body,
          files,
          diffStat,
        });
      }

      return commits;
    } catch (error) {
      console.warn('Failed to fetch git history:', error);
      return [];
    }
  }

  /**
   * Get list of files changed in a specific commit.
   */
  async getCommitFiles(hash: string): Promise<string[]> {
    try {
      const result = await this.git.show([hash, '--name-only', '--pretty=format:']);
      return result.trim().split('\n').filter(f => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Get diff statistics for a specific commit.
   */
  async getCommitDiffStat(hash: string): Promise<DiffStat> {
    try {
      const result = await this.git.show([hash, '--stat', '--pretty=format:']);
      // Parse the last line which contains summary like "3 files changed, 45 insertions(+), 12 deletions(-)"
      const lines = result.trim().split('\n');
      const summaryLine = lines[lines.length - 1];

      const filesMatch = summaryLine.match(/(\d+) files? changed/);
      const insertMatch = summaryLine.match(/(\d+) insertions?\(\+\)/);
      const deleteMatch = summaryLine.match(/(\d+) deletions?\(-\)/);

      return {
        files: filesMatch ? parseInt(filesMatch[1], 10) : 0,
        insertions: insertMatch ? parseInt(insertMatch[1], 10) : 0,
        deletions: deleteMatch ? parseInt(deleteMatch[1], 10) : 0,
      };
    } catch {
      return { files: 0, insertions: 0, deletions: 0 };
    }
  }

  /**
   * Get the diff of a specific commit for analysis.
   */
  async getCommitDiff(hash: string): Promise<string> {
    try {
      return await this.git.show([hash, '--stat', '--oneline']);
    } catch {
      return '';
    }
  }
}

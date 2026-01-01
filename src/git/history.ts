import { SimpleGit, simpleGit } from 'simple-git';

export interface CommitInfo {
  hash: string;
  date: string;
  author: string;
  message: string;
  body: string;
  files: string[];
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

    const options = {
      file: filePaths,
      '--max-count': limit,
      '--no-merges': null,
    };

    if (since) {
      Object.assign(options, { '--since': since });
    }

    try {
      const log = await this.git.log(options);
      
      return log.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        author: commit.author_name,
        message: commit.message,
        body: commit.body,
        files: [] // We'd need --name-only to get this, keeping it simple for now
      }));
    } catch (error) {
      console.warn('Failed to fetch git history:', error);
      return [];
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

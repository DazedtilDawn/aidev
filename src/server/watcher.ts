import { watch, FSWatcher } from 'chokidar';
import { Server } from 'socket.io';

export class ProjectWatcher {
  private watcher: FSWatcher | null = null;

  constructor(private projectPath: string, private io: Server) {}

  start() {
    console.log(`👀 Watching for changes in ${this.projectPath}...`);
    
    // Watch for changes in src and .aidev
    this.watcher = watch(['src/**/*', '.aidev/model/**/*'], {
      cwd: this.projectPath,
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/dist/**']
    });

    this.watcher.on('change', async (path: string) => {
      console.log(`File changed: ${path}. Refreshing graph...`);
      await this.notifyClients();
    });

    this.watcher.on('add', async (path: string) => {
      console.log(`File added: ${path}. Refreshing graph...`);
      await this.notifyClients();
    });

    this.watcher.on('unlink', async (path: string) => {
      console.log(`File removed: ${path}. Refreshing graph...`);
      await this.notifyClients();
    });
  }

  private async notifyClients() {
    try {
      // We don't perform a full sync here (that's heavy), 
      // but we signal the UI to re-fetch the graph.
      // In a real app, we might push the partial diff.
      this.io.emit('graph_update', { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to notify clients of update:', error);
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

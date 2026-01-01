import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

interface ProjectRegistry {
  recent: string[];
  lastActive?: string;
}

export class ProjectManager {
  private activePath: string;
  private registryPath: string;
  private recentProjects: Set<string>;

  constructor() {
    // Default to CWD
    this.activePath = process.cwd();
    
    // Setup global config in home dir for persistence across sessions
    const configDir = join(homedir(), '.aidev', 'global');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    this.registryPath = join(configDir, 'projects.json');
    this.recentProjects = new Set([this.activePath]);
    
    this.loadRegistry();
  }

  private loadRegistry() {
    if (existsSync(this.registryPath)) {
      try {
        const data = JSON.parse(readFileSync(this.registryPath, 'utf-8')) as ProjectRegistry;
        if (data.recent) {
          data.recent.forEach(p => this.recentProjects.add(p));
        }
        if (data.lastActive && existsSync(data.lastActive)) {
          this.activePath = data.lastActive;
        }
      } catch (e) {
        console.warn('Failed to load project registry', e);
      }
    }
  }

  private saveRegistry() {
    const data: ProjectRegistry = {
      recent: Array.from(this.recentProjects),
      lastActive: this.activePath
    };
    try {
      writeFileSync(this.registryPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save project registry', e);
    }
  }

  getActivePath(): string {
    return this.activePath;
  }

  setActivePath(path: string): boolean {
    const resolved = resolve(path);
    if (!existsSync(resolved)) {
      return false;
    }
    this.activePath = resolved;
    this.recentProjects.add(resolved);
    this.saveRegistry();
    return true;
  }

  getRecentProjects(): string[] {
    return Array.from(this.recentProjects);
  }

  addProject(path: string): boolean {
    const resolved = resolve(path);
    if (!existsSync(resolved)) {
      return false;
    }
    this.recentProjects.add(resolved);
    this.saveRegistry();
    return true;
  }
}

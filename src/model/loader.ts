import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { parseComponent, Component } from '../schemas/component.js';
import { parseEdge, Edge } from '../schemas/edge.js';
import { parseConfig, Config } from '../schemas/config.js';

export interface ProjectModel {
  config: Config;
  components: Component[];
  declaredEdges: Edge[];
  discoveredEdges: Edge[];
  // Reverse lookup: component -> components that depend on it (built at load time per ChatGPT review)
  dependentsByComponent: Map<string, string[]>;
}

export async function loadProjectModel(projectPath: string): Promise<ProjectModel> {
  const aidevPath = join(projectPath, '.aidev');

  if (!existsSync(aidevPath)) {
    return {
      config: parseConfig({}),
      components: [],
      declaredEdges: [],
      discoveredEdges: [],
      dependentsByComponent: new Map(),
    };
  }

  const config = loadConfig(aidevPath);
  const components = loadComponents(aidevPath);
  const declaredEdges = loadEdges(aidevPath, 'declared_edges.yaml');
  const discoveredEdges = loadEdges(aidevPath, 'discovered_edges.yaml');

  // Build reverse edge map for O(1) impact lookup (per ChatGPT review)
  const dependentsByComponent = buildDependentsMap(components);

  return { config, components, declaredEdges, discoveredEdges, dependentsByComponent };
}

// Build reverse lookup: for each component, who depends on it?
function buildDependentsMap(components: Component[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  // Initialize all components with empty arrays
  for (const c of components) {
    map.set(c.name, []);
  }

  // Build reverse edges
  for (const c of components) {
    for (const dep of c.depends_on) {
      const dependents = map.get(dep) || [];
      dependents.push(c.name);
      map.set(dep, dependents);
    }
  }

  return map;
}

function loadConfig(aidevPath: string): Config {
  const configPath = join(aidevPath, 'config.yaml');
  if (!existsSync(configPath)) {
    return parseConfig({});
  }
  const content = readFileSync(configPath, 'utf-8');
  return parseConfig(yaml.load(content));
}

function loadComponents(aidevPath: string): Component[] {
  const componentsDir = join(aidevPath, 'model', 'components');
  if (!existsSync(componentsDir)) {
    return [];
  }

  const files = readdirSync(componentsDir).filter(f => f.endsWith('.yaml') && !f.startsWith('_'));
  return files.map(file => {
    const content = readFileSync(join(componentsDir, file), 'utf-8');
    return parseComponent(yaml.load(content));
  });
}

function loadEdges(aidevPath: string, filename: string): Edge[] {
  const edgesPath = join(aidevPath, 'model', 'graph', filename);
  if (!existsSync(edgesPath)) {
    return [];
  }
  const content = readFileSync(edgesPath, 'utf-8');
  const data = yaml.load(content) as { edges?: unknown[] };
  return (data.edges || []).map(e => parseEdge(e));
}

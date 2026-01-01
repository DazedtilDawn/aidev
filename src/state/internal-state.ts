import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const STATE_FILE = 'internal_state.xml';
const STATE_DIR = '.aidev/state';

export interface InternalState {
  project: {
    name: string;
    north_star: string;
    core_patterns: string;
  };
  facts: {
    fact: Array<{
      '@_source': string;
      '@_id': string;
      '@_confidence': string;
      '@_last_verified': string;
      '#text': string;
    }>;
  };
  invariants: {
    invariant: Array<{
      '@_file': string;
      '@_id': string;
      '#text': string;
    }>;
  };
  open_threads: {
    thread: Array<{
      '@_id': string;
      '@_status': string;
      '#text': string;
    }>;
  };
  decisions: {
    decision: Array<{
      '@_context': string;
      '@_date': string;
      '#text': string;
    }>;
  };
  recent_sessions: {
    session: Array<{
      '@_id': string;
      '@_intent': string;
      '@_outcome': string;
      insight: string;
    }>;
  };
}

export class InternalStateManager {
  private statePath: string;
  private parser: XMLParser;
  private builder: XMLBuilder;

  constructor(projectRoot: string) {
    this.statePath = join(projectRoot, STATE_DIR, STATE_FILE);
    this.parser = new XMLParser({ 
      ignoreAttributes: false,
      attributeNamePrefix: '@_' 
    });
    this.builder = new XMLBuilder({ 
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  '
    });
  }

  async load(): Promise<InternalState> {
    if (!existsSync(this.statePath)) {
      return this.createEmptyState();
    }
    const content = readFileSync(this.statePath, 'utf-8');
    const data = this.parser.parse(content);
    return data.IS as InternalState;
  }

  async save(state: InternalState): Promise<void> {
    const dir = join(this.statePath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const xml = this.builder.build({ IS: state });
    writeFileSync(this.statePath, xml, 'utf-8');
  }

  private createEmptyState(): InternalState {
    return {
      project: {
        name: 'AIDEV',
        north_star: 'Self-improving context engine',
        core_patterns: 'Async-first, Functional Core'
      },
      facts: { fact: [] },
      invariants: { invariant: [] },
      open_threads: { thread: [] },
      decisions: { decision: [] },
      recent_sessions: { session: [] }
    };
  }

  async addFact(fact: { text: string, source: string, confidence: string }): Promise<void> {
    const state = await this.load();
    // Ensure facts array exists (xml parser edge case for single/empty items)
    if (!Array.isArray(state.facts.fact)) state.facts.fact = state.facts.fact ? [state.facts.fact] : [];
    
    state.facts.fact.push({
      '#text': fact.text,
      '@_source': fact.source,
      '@_confidence': fact.confidence,
      '@_id': Math.random().toString(36).substring(7),
      '@_last_verified': new Date().toISOString().split('T')[0]
    });
    await this.save(state);
  }

  async getFactsBySource(sourcePrefix: string): Promise<any[]> {
    const state = await this.load();
    const facts = Array.isArray(state.facts.fact) ? state.facts.fact : (state.facts.fact ? [state.facts.fact] : []);
    return facts.filter(f => f['@_source'].startsWith(sourcePrefix));
  }
}

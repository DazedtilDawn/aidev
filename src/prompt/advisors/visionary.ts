import { BaseAdvisor, CouncilInsight } from './base.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * The Visionary: "Where are we going?"
 * Connects the current task to the project's long-term North Star.
 */
export class Visionary extends BaseAdvisor {
  name = 'Visionary';

  async provideInsights(): Promise<CouncilInsight[]> {
    const insights: CouncilInsight[] = [];
    const visionPath = join(process.cwd(), 'VISION.md');

    if (existsSync(visionPath)) {
      const content = readFileSync(visionPath, 'utf-8');
      
      insights.push({
        advisor: this.name,
        label: 'Strategic Alignment',
        content: `Project North Star: ${content.split('\n')[0]}`,
        provenance: 'VISION.md'
      });
    }

    return insights;
  }
}

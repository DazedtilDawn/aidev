import { InternalStateManager } from '../state/index.js';
import { CommitInfo } from '../git/index.js';
import { ClaudeRunner } from '../runner/claude.js';

export class DistillationEngine {
  private stateManager: InternalStateManager;
  private runner: ClaudeRunner;

  constructor(projectRoot: string) {
    this.stateManager = new InternalStateManager(projectRoot);
    this.runner = new ClaudeRunner();
  }

  async distillCommits(commits: CommitInfo[]): Promise<void> {
    if (commits.length === 0) return;

    const prompt = `
    You are the Senior Technical Historian for this project.
    Your mission: Distill raw commit logs into High-Fidelity Institutional Wisdom.

    <objective>
    Extract PERMANENT FACTS that explain the *evolution* of the codebase. 
    We do not care about *what* changed (the diff). We care about *why* it changed and *what we learned*.
    </objective>

    <input_data>
    ${commits.map(c => `[Commit ${c.hash.substring(0, 7)}] ${c.date}\n${c.message}\n`).join('\n')}
    </input_data>

    <distillation_rules>
    1. **Ignore Noise:** Skip formatting, typos, version bumps, or minor refactors without strategic intent.
    2. **Seek Causality:** If a commit fixes a bug, the Fact must state the *root cause* and the *fix pattern*.
       - BAD: "Fixed bug in validator."
       - GOOD: "Input validation logic was moved to the schema layer to prevent race conditions during form submission."
    3. **Capture Architecture:** Identify when new patterns (e.g., "moving to async-first") are introduced.
    4. **Source Truth:** Every fact MUST cite the specific commit hash as its source.
    </distillation_rules>

    <output_format>
    Return a SINGLE JSON object. No markdown, no conversation.
    {
      "facts": [
        { 
          "text": "Detailed, self-contained statement of wisdom.", 
          "source": "commit:<hash>", 
          "confidence": "high" | "medium" 
        }
      ]
    }
    </output_format>
    `;

    try {
      // Use 'Read' tool only, minimizing side effects during distillation
      const result = await this.runner.execute(prompt, ['Read']);
      
      const jsonMatch = result.result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.facts && Array.isArray(parsed.facts)) {
          for (const fact of parsed.facts) {
            await this.stateManager.addFact(fact);
          }
        }
      }
    } catch (error) {
      console.error('Distillation failed:', error);
    }
  }
}

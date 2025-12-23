import { spawn } from 'child_process';

export interface ClaudeExecutionResult {
  result: string;
  cost?: number;
  session_id?: string;
  error?: string;
}

export class ClaudeRunner {
  /**
   * Execute a prompt headlessly using Claude Code.
   */
  async execute(prompt: string, allowedTools: string[] = ['Read', 'Edit', 'Bash']): Promise<ClaudeExecutionResult> {
    return new Promise((resolve, reject) => {
      const args = [
        '-p', prompt,
        '--output-format', 'json',
        '--allowedTools', allowedTools.join(',')
      ];
      
      const child = spawn('claude', args, {
        shell: true,
        env: { 
          ...process.env, 
          CI: 'true', // Forces non-interactive mode
          // Ensure no PAGER is set to avoid hanging
          PAGER: 'cat' 
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          // If Claude fails, it might output JSON in stderr too, or just plain text
          return resolve({ result: stdout, error: stderr || 'Unknown error' });
        }

        try {
          // Claude Code outputs a JSON object at the end
          // It might be surrounded by other logs if verbose
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            resolve({
              result: parsed.result || parsed.text || '', 
              cost: parsed.cost,
              session_id: parsed.session_id
            });
          } else {
            // Fallback: Return raw stdout if JSON parsing fails
            resolve({ result: stdout });
          }
        } catch (e) {
          resolve({ result: stdout, error: 'Failed to parse JSON output' });
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }
}
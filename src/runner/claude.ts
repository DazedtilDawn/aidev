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
      // Use --print for non-interactive output
      const args = [
        '--print',
        '--output-format', 'json',
        '--allowedTools', allowedTools.join(',')
      ];
      
      // Cross-platform command resolution
      const command = process.platform === 'win32' ? 'claude.cmd' : 'claude';

      console.log(`[ClaudeRunner] Spawning: ${command} ${args.join(' ')}`);

      try {
        const child = spawn(command, args, {
          shell: true,
          env: { 
            ...process.env, 
            CI: 'true', // Forces non-interactive mode
            PAGER: 'cat' 
          }
        });

        // Pipe prompt to stdin
        child.stdin.write(prompt);
        child.stdin.end();

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          console.log(`[ClaudeRunner] Process exited with code ${code}`);
          if (code !== 0) {
            return resolve({ result: stdout, error: stderr || `Process exited with code ${code}` });
          }

          try {
            // Claude Code outputs a JSON object at the end
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              resolve({
                result: parsed.result || parsed.text || '', 
                cost: parsed.cost,
                session_id: parsed.session_id
              });
            } else {
              resolve({ result: stdout });
            }
          } catch (e) {
            resolve({ result: stdout, error: 'Failed to parse JSON output' });
          }
        });

        child.on('error', (err) => {
          console.error(`[ClaudeRunner] Spawn error:`, err);
          reject(err);
        });
      } catch (e) {
        console.error(`[ClaudeRunner] Immediate error:`, e);
        reject(e);
      }
    });
  }
}

import { describe, it, expect, vi } from 'vitest';
import { ClaudeRunner } from '../src/runner/claude.js';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';

describe('ClaudeRunner', () => {
  it('executes prompt and parses JSON', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    (spawn as any).mockReturnValue(mockProcess);

    const runner = new ClaudeRunner();
    const promise = runner.execute('hello');

    // Simulate CLI output
    const mockOutput = JSON.stringify({
      result: 'Hello world',
      cost: 0.05,
      session_id: 'sess_123'
    });

    mockProcess.stdout.emit('data', mockOutput);
    mockProcess.emit('close', 0);

    const result = await promise;
    expect(result.result).toBe('Hello world');
    expect(result.cost).toBe(0.05);
    expect(result.session_id).toBe('sess_123');
  });

  it('handles errors', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    (spawn as any).mockReturnValue(mockProcess);

    const runner = new ClaudeRunner();
    const promise = runner.execute('fail');

    mockProcess.stderr.emit('data', 'Authentication failed');
    mockProcess.emit('close', 1);

    const result = await promise;
    expect(result.error).toBe('Authentication failed');
  });
});
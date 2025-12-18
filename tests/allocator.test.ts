import { describe, it, expect } from 'vitest';
import { BudgetAllocator, ContextItem } from '../src/prompt/allocator.js';

describe('BudgetAllocator', () => {
  it('allocates items within category budgets', () => {
    // With 10000 budget: changed=40%=4000, impacted=25%=2500
    const items: ContextItem[] = [
      { category: 'changed', path: 'a.ts', content: 'x'.repeat(1000), tokens: 500, priority: 1.0 },
      { category: 'impacted', path: 'b.ts', content: 'y'.repeat(1000), tokens: 500, priority: 0.8 },
      { category: 'impacted', path: 'c.ts', content: 'z'.repeat(1000), tokens: 500, priority: 0.5 },
    ];

    const allocator = new BudgetAllocator(10000);
    const result = allocator.allocate(items);

    expect(result.allocated.length).toBe(3);
    expect(result.allocated[0].path).toBe('a.ts'); // Highest priority
  });

  it('respects category budget limits', () => {
    // With 10000 budget: changed=40%=4000 tokens
    const items: ContextItem[] = [
      { category: 'changed', path: 'a.ts', content: 'x', tokens: 2000, priority: 1.0 },
      { category: 'changed', path: 'b.ts', content: 'y', tokens: 2000, priority: 0.9 },
      { category: 'changed', path: 'c.ts', content: 'z', tokens: 2000, priority: 0.8 },
    ];

    const allocator = new BudgetAllocator(10000);
    const result = allocator.allocate(items);

    // Only 2 items fit in 4000 token budget for changed category
    expect(result.allocated.length).toBe(2);
    expect(result.dropped.length).toBe(1);
  });

  it('prioritizes higher priority items within category', () => {
    // With 10000 budget: impacted=max(3000, 2500)=3000 tokens (minTokens applied)
    const items: ContextItem[] = [
      { category: 'impacted', path: 'low.ts', content: 'a', tokens: 1500, priority: 0.3 },
      { category: 'impacted', path: 'high.ts', content: 'b', tokens: 1500, priority: 0.9 },
      { category: 'impacted', path: 'mid.ts', content: 'c', tokens: 1500, priority: 0.6 },
    ];

    const allocator = new BudgetAllocator(10000);
    const result = allocator.allocate(items);

    // Should include high and mid priority items (3000 budget, 3000 used)
    const allocatedPaths = result.allocated.map(i => i.path);
    expect(allocatedPaths).toContain('high.ts');
    expect(allocatedPaths).toContain('mid.ts');
    expect(result.dropped.length).toBe(1);
    expect(result.dropped[0].path).toBe('low.ts');
  });

  it('truncates large items when truncatable', () => {
    // With 10000 budget: changed=max(5000, 4000)=5000 tokens (minTokens applied)
    const items: ContextItem[] = [
      { category: 'changed', path: 'big.ts', content: 'x'.repeat(20000), tokens: 7000, priority: 1.0, truncatable: true },
    ];

    const allocator = new BudgetAllocator(10000);
    const result = allocator.allocate(items);

    expect(result.allocated.length).toBe(1);
    expect(result.allocated[0].tokens).toBeLessThanOrEqual(5000);
  });

  it('tracks dropped items when category budget exhausted', () => {
    // With 10000 budget: changed=4000 tokens
    const items: ContextItem[] = [
      { category: 'changed', path: 'a.ts', content: 'x', tokens: 3000, priority: 1.0 },
      { category: 'changed', path: 'b.ts', content: 'y', tokens: 3000, priority: 0.5 },
    ];

    const allocator = new BudgetAllocator(10000);
    const result = allocator.allocate(items);

    expect(result.allocated.length).toBe(1);
    expect(result.dropped.length).toBe(1);
    expect(result.dropped[0].path).toBe('b.ts');
  });

  it('reports budget usage by category', () => {
    const items: ContextItem[] = [
      { category: 'changed', path: 'a.ts', content: 'x', tokens: 100, priority: 1.0 },
      { category: 'impacted', path: 'b.ts', content: 'y', tokens: 100, priority: 0.8 },
    ];

    const allocator = new BudgetAllocator(10000);
    const result = allocator.allocate(items);

    expect(result.budgetUsed.changed).toBe(100);
    expect(result.budgetUsed.impacted).toBe(100);
  });
});

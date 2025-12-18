import { createEstimator, TokenEstimator } from '../tokens/index.js';

export type ContextCategory = 'task' | 'changed' | 'impacted' | 'contract' | 'architecture' | 'decision';

export interface ContextItem {
  category: ContextCategory;
  path?: string;
  content: string;
  tokens: number;
  priority: number;
  truncatable?: boolean;
}

export interface CategoryBudget {
  category: ContextCategory;
  percentage: number;
  minTokens: number;
  maxTokens: number;
}

/**
 * Error thrown when budget configuration is invalid.
 * Exit code: 10 (CONFIG_ERROR)
 */
export class BudgetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetValidationError';
  }
}

// Category budgets sum to 100% - frozen for immutability
// NOTE: Sum of minTokens = 11,700. For budgets < 10,000, minTokens are not enforced.
const DEFAULT_BUDGETS: readonly CategoryBudget[] = Object.freeze([
  Object.freeze({ category: 'task' as const, percentage: 0.05, minTokens: 200, maxTokens: 2000 }),
  Object.freeze({ category: 'changed' as const, percentage: 0.40, minTokens: 5000, maxTokens: 50000 }),
  Object.freeze({ category: 'impacted' as const, percentage: 0.25, minTokens: 3000, maxTokens: 30000 }),
  Object.freeze({ category: 'contract' as const, percentage: 0.15, minTokens: 2000, maxTokens: 20000 }),
  Object.freeze({ category: 'architecture' as const, percentage: 0.10, minTokens: 1000, maxTokens: 10000 }),
  Object.freeze({ category: 'decision' as const, percentage: 0.05, minTokens: 500, maxTokens: 5000 }),
]);

/**
 * Validates budget configuration at construction time.
 * Throws BudgetValidationError for invalid configurations.
 */
function validateBudgets(budgets: readonly CategoryBudget[]): void {
  const seen = new Set<string>();
  let pctSum = 0;

  for (const b of budgets) {
    if (seen.has(b.category)) {
      throw new BudgetValidationError(`Duplicate budget category: ${b.category}`);
    }
    seen.add(b.category);

    if (!Number.isFinite(b.percentage) || b.percentage < 0 || b.percentage > 1) {
      throw new BudgetValidationError(`Invalid percentage for ${b.category}: ${b.percentage}`);
    }
    if (!Number.isFinite(b.minTokens) || b.minTokens < 0) {
      throw new BudgetValidationError(`Invalid minTokens for ${b.category}: ${b.minTokens}`);
    }
    if (!Number.isFinite(b.maxTokens) || b.maxTokens < 0) {
      throw new BudgetValidationError(`Invalid maxTokens for ${b.category}: ${b.maxTokens}`);
    }
    if (b.minTokens > b.maxTokens) {
      throw new BudgetValidationError(`minTokens > maxTokens for ${b.category}: ${b.minTokens} > ${b.maxTokens}`);
    }

    pctSum += b.percentage;
  }

  // Allow tiny float error but enforce intent
  if (Math.abs(pctSum - 1) > 1e-9) {
    throw new BudgetValidationError(`Budget percentages must sum to 1.0 (got ${pctSum})`);
  }
}

// Validate defaults at module load
validateBudgets(DEFAULT_BUDGETS);

export interface AllocationResult {
  allocated: ContextItem[];
  dropped: ContextItem[];
  totalTokens: number;
  budgetUsed: Record<ContextCategory, number>;
}

export class BudgetAllocator {
  private tokenEstimator: TokenEstimator;
  private budgets: readonly CategoryBudget[];

  constructor(
    private totalBudget: number,
    budgets: readonly CategoryBudget[] = DEFAULT_BUDGETS
  ) {
    // Validate totalBudget
    if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
      throw new BudgetValidationError(`Invalid totalBudget: ${totalBudget}. Must be a positive number.`);
    }

    // Validate custom budgets if provided (defaults already validated at module load)
    if (budgets !== DEFAULT_BUDGETS) {
      validateBudgets(budgets);
    }

    this.tokenEstimator = createEstimator('generic');
    this.budgets = budgets;
  }

  allocate(items: ContextItem[]): AllocationResult {
    const categoryBudgets = this.calculateCategoryBudgets();
    const allocated: ContextItem[] = [];
    const dropped: ContextItem[] = [];
    const budgetUsed: Record<string, number> = {};

    // Initialize budget tracking for all categories
    for (const cat of this.budgets) {
      budgetUsed[cat.category] = 0;
    }

    // Group by category
    const byCategory = new Map<ContextCategory, ContextItem[]>();
    for (const item of items) {
      const list = byCategory.get(item.category) || [];
      list.push(item);
      byCategory.set(item.category, list);
    }

    // Allocate per category
    for (const [category, categoryItems] of byCategory) {
      const budget = categoryBudgets.get(category) || 0;
      let remaining = budget;

      // Sort by priority (highest first), then by path for determinism
      // NOTE: Using < > comparison instead of localeCompare() for locale-independent ordering
      const sorted = [...categoryItems].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        // Tie-break by path for deterministic, locale-independent ordering
        const ap = a.path ?? '';
        const bp = b.path ?? '';
        if (ap < bp) return -1;
        if (ap > bp) return 1;
        return 0;
      });

      for (const item of sorted) {
        if (item.tokens <= remaining) {
          allocated.push(item);
          remaining -= item.tokens;
          budgetUsed[category] = (budgetUsed[category] || 0) + item.tokens;
        } else if (item.truncatable && remaining > 100) {
          const truncated = this.truncateItem(item, remaining);
          allocated.push(truncated);
          budgetUsed[category] = (budgetUsed[category] || 0) + truncated.tokens;
          remaining = 0;
        } else {
          dropped.push(item);
        }
      }
    }

    return {
      allocated: allocated.sort((a, b) => b.priority - a.priority),
      dropped,
      totalTokens: Object.values(budgetUsed).reduce((a, b) => a + b, 0),
      budgetUsed: budgetUsed as Record<ContextCategory, number>,
    };
  }

  private calculateCategoryBudgets(): Map<ContextCategory, number> {
    const budgets = new Map<ContextCategory, number>();

    for (const b of this.budgets) {
      // Calculate based on percentage, respect max but don't force min if total is small
      let budget = Math.floor(this.totalBudget * b.percentage);
      budget = Math.min(budget, b.maxTokens);
      // Only apply minTokens if total budget allows
      if (this.totalBudget >= 10000) {
        budget = Math.max(b.minTokens, budget);
      }
      budgets.set(b.category, budget);
    }

    return budgets;
  }

  private truncateItem(item: ContextItem, maxTokens: number): ContextItem {
    const truncated = this.tokenEstimator.truncateToFit(item.content, maxTokens);
    const newTokens = this.tokenEstimator.estimateText(truncated);
    return {
      ...item,
      content: truncated,
      tokens: newTokens,
      truncatable: false,
    };
  }
}

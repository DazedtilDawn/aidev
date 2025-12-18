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

interface CategoryBudget {
  category: ContextCategory;
  percentage: number;
  minTokens: number;
  maxTokens: number;
}

// Category budgets sum to 100% - redistributed per ChatGPT review
const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'task', percentage: 0.05, minTokens: 200, maxTokens: 2000 },
  { category: 'changed', percentage: 0.40, minTokens: 5000, maxTokens: 50000 },
  { category: 'impacted', percentage: 0.25, minTokens: 3000, maxTokens: 30000 },
  { category: 'contract', percentage: 0.15, minTokens: 2000, maxTokens: 20000 },
  { category: 'architecture', percentage: 0.10, minTokens: 1000, maxTokens: 10000 },
  { category: 'decision', percentage: 0.05, minTokens: 500, maxTokens: 5000 },
];

export interface AllocationResult {
  allocated: ContextItem[];
  dropped: ContextItem[];
  totalTokens: number;
  budgetUsed: Record<ContextCategory, number>;
}

export class BudgetAllocator {
  private tokenEstimator: TokenEstimator;
  private budgets: CategoryBudget[];

  constructor(
    private totalBudget: number,
    budgets: CategoryBudget[] = DEFAULT_BUDGETS
  ) {
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

      // Sort by priority (highest first)
      const sorted = [...categoryItems].sort((a, b) => b.priority - a.priority);

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

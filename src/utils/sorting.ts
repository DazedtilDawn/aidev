type KeyExtractor<T> = (item: T) => string | number;

export function stableSortBy<T>(
  items: T[],
  ...keyExtractors: KeyExtractor<T>[]
): T[] {
  return [...items].sort((a, b) => {
    for (const extractor of keyExtractors) {
      const aVal = extractor(a);
      const bVal = extractor(b);
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

export function canonicalizeOutput(obj: unknown): string {
  return JSON.stringify(sortObjectKeys(obj), null, 2);
}

function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function sortedKeys<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj).sort() as (keyof T)[];
}

export function normalizePath(p: string): string {
  // Convert Windows separators to POSIX
  let normalized = p.replace(/\\/g, '/');
  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function relativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split('/');
  const toParts = normalizePath(to).split('/');

  // Find common prefix
  let commonLength = 0;
  while (commonLength < fromParts.length &&
         commonLength < toParts.length &&
         fromParts[commonLength] === toParts[commonLength]) {
    commonLength++;
  }

  const upCount = fromParts.length - commonLength - 1;
  const ups = Array(upCount).fill('..');
  const remainder = toParts.slice(commonLength);

  return [...ups, ...remainder].join('/') || '.';
}

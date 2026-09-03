/**
 * Compact counts for tight meta rows: 942 stays 942, 1_200 becomes 1.2k,
 * 12_000 becomes 12k. Exact values still go in the title attribute.
 */
export function formatCount(value: number): string {
  const n = Math.max(0, Math.round(value));
  if (n < 1000) return String(n);
  if (n < 10_000) {
    const tenths = Math.floor(n / 100) / 10;
    return `${tenths % 1 === 0 ? tenths.toFixed(0) : tenths.toFixed(1)}k`;
  }
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;
  const millions = Math.floor(n / 100_000) / 10;
  return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}m`;
}

/** "1 reader" / "142 readers" — pluralised against the real count. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

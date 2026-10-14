// The small "change" lines under the Overview stat cards, derived from the
// loaded rows (they used to be hard-coded text).

const DAY_MS = 24 * 60 * 60 * 1000;

/** "+3 in 30 days" for rows created in the last 30 days, else "None in 30 days". */
export function addedLast30Days(rows: { $createdAt?: string }[], nowMs = Date.now()): string {
  const since = nowMs - 30 * DAY_MS;
  const count = rows.filter((r) => {
    const at = r.$createdAt ? Date.parse(r.$createdAt) : Number.NaN;
    return at >= since && at <= nowMs;
  }).length;
  return count > 0 ? `+${count} in 30 days` : "None in 30 days";
}

/** "Latest: <title>" of the most recently added certification, or "None yet". */
export function latestCertification(certs: { title: string; $createdAt?: string }[]): string {
  let latest: { title: string; at: number } | null = null;
  for (const c of certs) {
    const at = c.$createdAt ? Date.parse(c.$createdAt) : Number.NaN;
    if (Number.isNaN(at)) continue;
    if (!latest || at > latest.at) latest = { title: c.title, at };
  }
  return latest ? `Latest: ${latest.title}` : "None yet";
}

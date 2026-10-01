/** Normalize to RFC3339 UTC with Z suffix for Google Forms response filters. */
export function toGoogleFormsUtcTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return new Date(0).toISOString().replace('.000Z', 'Z');
  }
  return date.toISOString().replace('.000Z', 'Z');
}

/** Use >= with a 1-second overlap to avoid losing boundary responses; dedupe by responseId downstream. */
export function buildResponseSyncFilter(lastResponseSyncAt: string | null): string | undefined {
  if (!lastResponseSyncAt) return undefined;
  const base = new Date(lastResponseSyncAt);
  if (Number.isNaN(base.getTime())) return undefined;
  const overlap = new Date(base.getTime() - 1000);
  const timestamp = toGoogleFormsUtcTimestamp(overlap.toISOString());
  return `timestamp >= ${timestamp}`;
}

/** Extract RFC3339 timestamp from a Google Forms REST filter for Apps Script sync. */
export function extractLastSyncAtFromGoogleFormsFilter(filter?: string): string | null {
  if (!filter?.trim()) return null;
  const match = /^\s*timestamp\s*>=\s*(\S+)\s*$/i.exec(filter.trim());
  if (!match) return null;
  const timestamp = match[1];
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return toGoogleFormsUtcTimestamp(parsed.toISOString());
}

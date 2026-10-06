/** Human-readable Bamboo / time-off type for UI (no invented types). */
export function formatBambooTimeOffType(raw?: string | null): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "Time off";
  if (/^holiday$/i.test(trimmed)) return "Holiday";
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

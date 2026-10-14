/** The note may already lead with the range ("20–24 Oct · starts in 6 days"); show the date once. */
export function availabilityDetail(rangeLabel: string, note: string | undefined): string {
  const text = (note ?? "").trim();
  if (!text) return "";
  const range = rangeLabel.trim();
  if (range && text === range) return "";
  if (range && text.startsWith(`${range} · `)) return text.slice(range.length + 3).trim();
  return text;
}

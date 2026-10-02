import type { ActionItem } from "./actionTypes";

export function dedupeActions(items: ActionItem[]): ActionItem[] {
  const seen = new Set<string>();
  const out: ActionItem[] = [];
  for (const item of items) {
    const key =
      item.kind === "review_bottleneck" && item.count
        ? `${item.kind}:${item.personId ?? "team"}:${item.title}`
        : `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function aggregateStaleReviewActions(
  rows: { issueKey: string; daysInReview: number }[],
): ActionItem | null {
  if (rows.length === 0) return null;
  const keys = rows.map((r) => r.issueKey);
  const preview = keys.slice(0, 2);
  const extra = keys.length - preview.length;
  return {
    id: "team-stale-review",
    kind: "review_bottleneck",
    severity: rows.length >= 3 ? "warning" : "info",
    title: `${rows.length} tasks in Review for 7+ days`,
    description:
      extra > 0
        ? `${preview.join(" · ")} · +${extra}`
        : preview.join(" · "),
    issueKeys: keys,
    count: rows.length,
    target: { kind: "delivery-risk" },
    source: "jira",
  };
}

import type { BadgeVariant } from "../../components/Badge/Badge";

/** Canonical Jira status chip mapping for tables (display only). */
export function issueStatusBadgeVariant(status: string): BadgeVariant {
  const normalized = status.trim().toLowerCase();
  if (
    normalized.includes("done") ||
    normalized.includes("approved") ||
    normalized.includes("complete")
  ) {
    return "success";
  }
  if (
    normalized.includes("hold") ||
    normalized.includes("block") ||
    normalized.includes("cancel")
  ) {
    return "warning";
  }
  if (normalized.includes("review") || normalized.includes("progress")) {
    return "neutral";
  }
  return "neutral";
}

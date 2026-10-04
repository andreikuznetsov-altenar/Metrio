import type { BadgeVariant } from "../components/Badge/Badge";

const EXACT: Record<string, BadgeVariant> = {
  Available: "success",
  Balanced: "success",
  Overloaded: "warning",
  "Long Review": "warning",
  "No activity": "warning",
  Blocked: "danger",
  "First pass": "success",
  Rework: "warning",
  Connected: "success",
  "Not configured": "neutral",
  Heavy: "warning",
};

export function badgeVariantForAttentionLabel(label: string): BadgeVariant {
  const trimmed = label.trim();
  if (EXACT[trimmed]) return EXACT[trimmed];
  if (/blocked/i.test(trimmed)) return "danger";
  if (/review/i.test(trimmed) && /long/i.test(trimmed)) return "warning";
  if (/overload/i.test(trimmed)) return "warning";
  if (/available/i.test(trimmed)) return "success";
  return "neutral";
}

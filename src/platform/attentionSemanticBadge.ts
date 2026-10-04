import type { BadgeVariant } from "../components/Badge/Badge";

/** Central semantic badge mapping — Pass 5E. */
const EXACT: Record<string, BadgeVariant> = {
  Available: "success",
  Balanced: "success",
  Light: "neutral",
  Heavy: "warning",
  Overloaded: "warning",
  "Long Review": "warning",
  "No activity": "warning",
  Blocked: "danger",
  "On Hold": "warning",
  "First pass": "success",
  Rework: "warning",
  Connected: "success",
  "Not configured": "neutral",
  Error: "danger",
  "Coverage risk": "warning",
  "On leave": "neutral",
};

export function badgeVariantForAttentionLabel(label: string): BadgeVariant {
  const trimmed = label.trim();
  if (EXACT[trimmed]) return EXACT[trimmed];
  if (/blocked/i.test(trimmed)) return "danger";
  if (/error/i.test(trimmed)) return "danger";
  if (/review/i.test(trimmed) && /long/i.test(trimmed)) return "warning";
  if (/no activity/i.test(trimmed)) return "warning";
  if (/overload/i.test(trimmed)) return "warning";
  if (/on hold/i.test(trimmed)) return "warning";
  if (/available/i.test(trimmed)) return "success";
  if (/first pass/i.test(trimmed)) return "success";
  if (/rework/i.test(trimmed)) return "warning";
  return "neutral";
}

export { badgeVariantForAttentionLabel as badgeVariantForSemanticLabel };

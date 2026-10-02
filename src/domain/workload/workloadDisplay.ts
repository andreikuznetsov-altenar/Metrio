import type { BadgeVariant } from "../../components/Badge/Badge";

/** Team Performance workload labels (single vocabulary across overview, people, drawer). */
export type WorkloadDisplayLabel = "Light" | "Balanced" | "Heavy" | "Overloaded";

export function workloadDisplayLabel(level: string | undefined): WorkloadDisplayLabel {
  if (level === "low") return "Light";
  if (level === "overloaded") return "Overloaded";
  if (level === "high") return "Heavy";
  return "Balanced";
}

export function workloadDisplayBadgeVariant(level: string | undefined): BadgeVariant {
  if (level === "overloaded") return "danger";
  if (level === "high") return "warning";
  if (level === "low") return "success";
  return "neutral";
}

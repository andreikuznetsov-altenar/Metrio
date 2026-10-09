import type { BadgeVariant } from "../../components/Badge/Badge";
import type { WorkloadDisplayLabel } from "../workload/workloadDisplay";

export function availabilityBadgeVariant(label: string): BadgeVariant {
  const normalized = label.trim().toLowerCase();
  if (normalized === "available" || normalized.startsWith("available")) {
    return "success";
  }
  if (
    normalized.includes("vacation") ||
    normalized.includes("away") ||
    normalized.includes("off")
  ) {
    return "warning";
  }
  if (normalized.includes("return")) {
    return "info";
  }
  return "neutral";
}

export function deliveryStatusBadgeVariant(status: string): BadgeVariant {
  const normalized = status.toLowerCase();
  if (normalized.includes("block")) return "danger";
  if (normalized.includes("review") || normalized.includes("rework")) {
    return "warning";
  }
  return "neutral";
}

export function workloadBadgeVariantFromLabel(
  label: WorkloadDisplayLabel | string,
): BadgeVariant {
  if (label === "Overloaded") return "danger";
  if (label === "Heavy") return "warning";
  if (label === "Light") return "success";
  if (label === "Not enough history") return "neutral";
  return "neutral";
}

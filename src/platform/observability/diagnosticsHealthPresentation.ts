import type { BadgeVariant } from "../../components/Badge/Badge";
import type { IntegrationHealthSnapshot } from "./types";

export function formatConnectionHealthLabel(
  state: IntegrationHealthSnapshot["connectionState"],
): string {
  switch (state) {
    case "connected":
      return "Connected";
    case "not_configured":
      return "Not configured";
    case "unavailable":
      return "Unavailable";
    case "authentication_required":
      return "Failed";
    case "permission_limited":
      return "Limited permissions";
    default:
      return "Unknown";
  }
}

export function badgeVariantForConnectionState(
  state: IntegrationHealthSnapshot["connectionState"],
): BadgeVariant {
  switch (state) {
    case "connected":
      return "success";
    case "not_configured":
      return "neutral";
    case "permission_limited":
      return "warning";
    case "authentication_required":
    case "unavailable":
      return "danger";
    default:
      return "neutral";
  }
}

import type { OrgResolutionResult } from "../../services/bamboo/orgResolver";
import type { OrgHierarchyScope } from "./orgRole";
import { resolveOrgHierarchyScope } from "./orgRole";

function cacheKey(org: OrgResolutionResult): string {
  if (!org.ok || !org.employee?.id) return "unresolved";
  const parts = [
    org.employee.id,
    org.directReports.map((r) => r.id).join(","),
    org.fullTeam.map((r) => r.id).join(","),
  ];
  return parts.join("|");
}

let lastKey = "";
let lastScope: OrgHierarchyScope | null = null;

/** In-memory cache for the active session; invalidated when org resolution payload changes. */
export function resolveOrgHierarchyScopeCached(
  org: OrgResolutionResult,
): OrgHierarchyScope | null {
  const key = cacheKey(org);
  if (key === lastKey) {
    return lastScope;
  }
  lastKey = key;
  lastScope = resolveOrgHierarchyScope(org);
  return lastScope;
}

export function resetOrgHierarchyCache(): void {
  lastKey = "";
  lastScope = null;
}

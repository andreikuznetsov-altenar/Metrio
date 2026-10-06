import type { OrgResolutionResult } from "../../services/bamboo/orgResolver";
import type { OrgHierarchyScope } from "./orgRole";
import { resolveOrgHierarchyScope } from "./orgRole";

function reportingLinks(org: OrgResolutionResult): string {
  const roster = [
    ...(org.employee ? [org.employee] : []),
    ...org.directReports,
    ...org.fullTeam,
  ];
  const seen = new Set<string>();
  const links: string[] = [];
  for (const person of roster) {
    if (seen.has(person.id)) continue;
    seen.add(person.id);
    links.push(`${person.id}:${person.supervisorId ?? ""}`);
  }
  links.sort();
  return links.join("|");
}

function cacheKey(org: OrgResolutionResult): string {
  if (!org.ok || !org.employee?.id) return "unresolved";
  const parts = [
    org.employee.id,
    org.directReports.map((r) => r.id).join(","),
    reportingLinks(org),
  ];
  return parts.join("|");
}

export function teamDetectionReportingSignature(
  org: OrgResolutionResult | null,
): string {
  if (!org?.ok) return "unresolved";
  return cacheKey(org);
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

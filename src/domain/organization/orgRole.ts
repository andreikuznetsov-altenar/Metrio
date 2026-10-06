import type { OrgResolutionResult, ResolvedEmployee } from "../../services/bamboo/orgResolver";
import {
  buildOrgGraph,
  collectDescendantIds,
  collectOrgGraphDiagnostics,
  employeeHasDirectReports,
  maxDepthBelow,
  rosterFromOrgResolution,
  type OrgNode,
} from "./orgGraph";

export type OrgRole =
  | "individual_contributor"
  | "leaf_manager"
  | "manager_of_managers";

export type OrgRoleResolutionState =
  | { ok: true; role: OrgRole }
  | { ok: false; role: "unresolved"; reason: string };

export interface TopLevelManagerBranch {
  managerId: string;
  descendantIds: string[];
  totalPeople: number;
}

export interface OrgHierarchyScope {
  currentUserId: string;
  role: OrgRole;
  supervisorId?: string;
  directReportIds: string[];
  directManagerReportIds: string[];
  directIndividualContributorIds: string[];
  /** Self plus all recursive descendants (manager_of_managers / totals). */
  descendantIds: string[];
  topLevelManagerBranches: TopLevelManagerBranch[];
  maxDepthBelow: number;
  graphWarnings: string[];
}

export function resolveOrgRoleFromGraph(
  currentUserId: string,
  graph: Map<string, OrgNode>,
  fallbackDirectReportIds: string[] = [],
): OrgRoleResolutionState {
  const node = graph.get(currentUserId);
  if (!node) {
    return { ok: false, role: "unresolved", reason: "Current user not in org graph." };
  }

  const directReportIds =
    node.directReportIds.length > 0
      ? [...node.directReportIds]
      : [...fallbackDirectReportIds];
  if (directReportIds.length === 0) {
    return { ok: true, role: "individual_contributor" };
  }

  const anyManagerReport = directReportIds.some((id) =>
    employeeHasDirectReports(id, graph),
  );
  if (anyManagerReport) {
    return { ok: true, role: "manager_of_managers" };
  }

  return { ok: true, role: "leaf_manager" };
}

export function resolveOrgRole(org: OrgResolutionResult): OrgRoleResolutionState {
  if (!org.ok || !org.employee?.id) {
    return { ok: false, role: "unresolved", reason: org.error ?? "Org resolution failed." };
  }

  const roster = rosterFromOrgResolution(org);
  const graph = buildOrgGraph(roster);
  return resolveOrgRoleFromGraph(
    org.employee.id,
    graph,
    org.directReports.map((report) => report.id),
  );
}

export function resolveOrgHierarchyScope(
  org: OrgResolutionResult,
): OrgHierarchyScope | null {
  const roleState = resolveOrgRole(org);
  if (!roleState.ok || !org.employee?.id) {
    return null;
  }

  const roster = rosterFromOrgResolution(org);
  const graph = buildOrgGraph(roster);
  const currentUserId = org.employee.id;
  const node = graph.get(currentUserId);
  if (!node) {
    return null;
  }

  const graphWarnings = collectOrgGraphDiagnostics(graph);
  const directReportIds =
    node.directReportIds.length > 0
      ? [...node.directReportIds]
      : org.directReports.map((report) => report.id);
  const directManagerReportIds = directReportIds.filter((id) =>
    employeeHasDirectReports(id, graph),
  );
  const directIndividualContributorIds = directReportIds.filter(
    (id) => !employeeHasDirectReports(id, graph),
  );

  const descendantIds =
    roleState.role === "individual_contributor"
      ? [currentUserId]
      : roleState.role === "leaf_manager"
        ? [currentUserId, ...directReportIds]
        : [
            currentUserId,
            ...collectDescendantIds(currentUserId, graph, { includeRoot: false }),
          ];

  const uniqueDescendants = [...new Set(descendantIds)];

  const topLevelManagerBranches: TopLevelManagerBranch[] =
    roleState.role === "manager_of_managers"
      ? directManagerReportIds.map((managerId) => {
          const branchDescendants = [
            managerId,
            ...collectDescendantIds(managerId, graph, { includeRoot: false }),
          ];
          const uniqueBranch = [...new Set(branchDescendants)];
          return {
            managerId,
            descendantIds: uniqueBranch,
            totalPeople: uniqueBranch.length,
          };
        })
      : [];

  return {
    currentUserId,
    role: roleState.role,
    supervisorId: org.employee.supervisorId ?? node.supervisorId,
    directReportIds,
    directManagerReportIds,
    directIndividualContributorIds,
    descendantIds: uniqueDescendants,
    topLevelManagerBranches,
    maxDepthBelow: maxDepthBelow(currentUserId, graph),
    graphWarnings,
  };
}

export function resolveSupervisorEmployee(
  org: OrgResolutionResult,
  roster: ResolvedEmployee[],
): ResolvedEmployee | undefined {
  if (!org.employee?.supervisorId) return undefined;
  return roster.find((p) => p.id === org.employee?.supervisorId);
}

export function formatOrgRoleLabel(role: OrgRole | "unresolved"): string {
  switch (role) {
    case "individual_contributor":
      return "individual_contributor";
    case "leaf_manager":
      return "leaf_manager";
    case "manager_of_managers":
      return "manager_of_managers";
    default:
      return "unresolved";
  }
}

import type { OrgHierarchyScope } from "./orgRole";
import { formatOrgRoleLabel } from "./orgRole";

export function formatOrgHierarchyDiagnostics(
  hierarchy: OrgHierarchyScope | null | undefined,
): string {
  if (!hierarchy) {
    return "Current org role: unresolved\n";
  }

  const lines = [
    `Current org role: ${formatOrgRoleLabel(hierarchy.role)}`,
    `Direct reports: ${hierarchy.directReportIds.length}`,
    `Direct manager reports: ${hierarchy.directManagerReportIds.length}`,
    `Direct individual contributors: ${hierarchy.directIndividualContributorIds.length}`,
    `Total descendants: ${hierarchy.descendantIds.length}`,
    `Leadership branches: ${hierarchy.topLevelManagerBranches.length}`,
    `Max depth below: ${hierarchy.maxDepthBelow}`,
  ];

  if (hierarchy.topLevelManagerBranches.length) {
    lines.push("", "Branches:");
    for (const branch of hierarchy.topLevelManagerBranches) {
      lines.push(`  ${branch.managerId} — ${branch.totalPeople} descendants`);
    }
  }

  if (hierarchy.directIndividualContributorIds.length) {
    lines.push(
      "",
      `Direct ICs: ${hierarchy.directIndividualContributorIds.length}`,
    );
  }

  if (hierarchy.graphWarnings.length) {
    lines.push("", "Graph warnings:");
    for (const warning of hierarchy.graphWarnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join("\n");
}

import { describe, expect, it, vi } from "vitest";
import { loadPreferences } from "../../platform/preferences";
import {
  formatOrgRoleLabel,
  resolveOrgHierarchyScope,
  resolveOrgRole,
  resolveOrgRoleFromGraph,
  type OrgRole,
} from "./orgRole";
import { buildOrgGraph, rosterFromOrgResolution } from "./orgGraph";
import { resolveOrgFeatureAccess } from "./orgFeatureAccess";
import { formatOrgHierarchyDiagnostics } from "./orgDiagnostics";

const runReal = process.env.METRIO_ORG_ROLE_QA === "1";

vi.mock("@tauri-apps/api/core", async () => {
  if (process.env.METRIO_ORG_ROLE_QA !== "1") {
    return { invoke: vi.fn() };
  }
  const { metrioRealInvoke } = await import("../../test/helpers/metrioRealInvoke");
  return {
    invoke: (command: string, args?: Record<string, unknown>) =>
      metrioRealInvoke(command, args),
  };
});

function directReportIdsForPerson(
  roster: ReturnType<typeof rosterFromOrgResolution>,
  graph: ReturnType<typeof buildOrgGraph>,
  personId: string,
): string[] {
  const fromGraph = graph.get(personId)?.directReportIds ?? [];
  if (fromGraph.length > 0) {
    return fromGraph;
  }
  return roster
    .filter((person) => person.supervisorId === personId)
    .map((person) => person.id);
}

function roleExampleSlot(
  roster: ReturnType<typeof rosterFromOrgResolution>,
  graph: ReturnType<typeof buildOrgGraph>,
  target: OrgRole,
  excludePersonId?: string,
): {
  personId: string;
  directReports: number;
  managerDirectReports: number;
  resolvedRole: string;
  match: boolean;
} | null {
  for (const person of roster) {
    if (excludePersonId && person.id === excludePersonId) {
      continue;
    }
    const directReportIds = directReportIdsForPerson(roster, graph, person.id);
    const resolved = resolveOrgRoleFromGraph(person.id, graph, directReportIds);
    if (!resolved.ok || resolved.role !== target) continue;
    const managerReports = directReportIds.filter((id) =>
      Boolean(graph.get(id)?.directReportIds.length),
    );
    return {
      personId: person.id,
      directReports: directReportIds.length,
      managerDirectReports: managerReports.length,
      resolvedRole: resolved.role,
      match: true,
    };
  }
  return null;
}

describe.skipIf(!runReal)("ORG role real Bamboo QA", () => {
  it(
    "reports safe hierarchy diagnostics for current user",
    async () => {
      const prefs = await loadPreferences();
      const org = prefs.teamDetection;
      expect(org?.ok).toBe(true);
      const roleState = resolveOrgRole(org!);
      const hierarchy = resolveOrgHierarchyScope(org!);
      const roster = rosterFromOrgResolution(org!);
      const graph = buildOrgGraph(roster);
      const access = resolveOrgFeatureAccess(
        roleState.ok ? roleState.role : "unresolved",
      );

      const report = {
        employeeId: org!.employee?.id,
        orgRole: formatOrgRoleLabel(roleState.ok ? roleState.role : "unresolved"),
        supervisorId: org!.employee?.supervisorId ?? null,
        directReports: org!.directReports.length,
        directManagerReports: hierarchy?.directManagerReportIds.length ?? 0,
        directIndividualContributors:
          hierarchy?.directIndividualContributorIds.length ?? 0,
        totalDescendants: hierarchy?.descendantIds.length ?? 0,
        maxDepth: hierarchy?.maxDepthBelow ?? 0,
        leadershipBranches: hierarchy?.topLevelManagerBranches.length ?? 0,
        branchLeaders: hierarchy?.topLevelManagerBranches.map((b) => ({
          leaderId: b.managerId,
          subtreePeople: b.totalPeople,
        })),
        graphDerivedRoleMatch: roleState.ok
          ? resolveOrgRoleFromGraph(
              org!.employee!.id,
              graph,
              org!.directReports.map((r) => r.id),
            ).role === roleState.role
          : false,
        diagnosticsText: formatOrgHierarchyDiagnostics(hierarchy),
        featureAccess: {
          showFeedbackTab: access.showFeedbackTab,
          canViewSurveyManagement: access.canViewSurveyManagement,
          usesLeadershipBranchView: access.usesLeadershipBranchView,
          usesDirectTeamView: access.usesDirectTeamView,
          usesSelfView: access.usesSelfView,
        },
      };

      // eslint-disable-next-line no-console
      console.log("[ORG ROLE QA] current user\n", JSON.stringify(report, null, 2));

      const currentId = org!.employee?.id;
      const roleExamples: Record<OrgRole, ReturnType<typeof roleExampleSlot>> = {
        individual_contributor: roleExampleSlot(
          roster,
          graph,
          "individual_contributor",
          currentId,
        ),
        leaf_manager:
          roleState.ok && roleState.role === "leaf_manager" && currentId
            ? {
                personId: currentId,
                directReports: org!.directReports.length,
                managerDirectReports:
                  hierarchy?.directManagerReportIds.length ?? 0,
                resolvedRole: "leaf_manager",
                match: true,
              }
            : roleExampleSlot(roster, graph, "leaf_manager"),
        manager_of_managers: roleExampleSlot(roster, graph, "manager_of_managers"),
      };

      // eslint-disable-next-line no-console
      console.log(
        "[ORG ROLE QA] role examples in accessible roster\n",
        JSON.stringify(
          {
            individual_contributor:
              roleExamples.individual_contributor ?? "NOT AVAILABLE IN REAL SCOPE",
            leaf_manager:
              roleExamples.leaf_manager ?? "NOT AVAILABLE IN REAL SCOPE",
            manager_of_managers:
              roleExamples.manager_of_managers ?? "NOT AVAILABLE IN REAL SCOPE",
          },
          null,
          2,
        ),
      );

      if (hierarchy?.role === "manager_of_managers" && hierarchy.topLevelManagerBranches[0]) {
        const branch = hierarchy.topLevelManagerBranches[0];
        const leaderNode = graph.get(branch.managerId);
        // eslint-disable-next-line no-console
        console.log(
          "[ORG ROLE QA] sample leadership branch\n",
          JSON.stringify(
            {
              leaderId: branch.managerId,
              directReports: leaderNode?.directReportIds.length ?? 0,
              recursiveDescendants: branch.descendantIds.length,
              uniquePeopleInSubtree: branch.totalPeople,
              maxDepthNote:
                hierarchy.maxDepthBelow > 2
                  ? "depth_ok_for_recursion_check"
                  : "REAL HIERARCHY TOO SHALLOW FOR DEEP CASE",
            },
            null,
            2,
          ),
        );
      }

      const icExample = roleExamples.individual_contributor;
      if (icExample) {
        const ic = roster.find((p) => p.id === icExample.personId);
        const supervisorId =
          ic?.supervisorId ??
          (currentId && icExample.personId !== currentId ? currentId : undefined);
        const supervisor = supervisorId
          ? roster.find((p) => p.id === supervisorId) ??
            (supervisorId === currentId ? org!.employee : undefined)
          : undefined;
        // eslint-disable-next-line no-console
        console.log(
          "[ORG ROLE QA] IC manager card mapping\n",
          JSON.stringify(
            {
              icPersonId: icExample.personId,
              supervisorId: supervisorId ?? null,
              managerDisplayName: supervisor?.displayName ?? null,
              managerJobTitle: supervisor?.jobTitle ?? null,
              managerWorkEmail: supervisor?.workEmail ?? null,
              managerDepartment: supervisor?.department ?? null,
              workPhone: "WORK PHONE NOT AVAILABLE IN SAFE MAPPING",
            },
            null,
            2,
          ),
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(
          "[ORG ROLE QA] IC manager card: NOT AVAILABLE IN REAL SCOPE",
        );
      }

      if (roleState.ok) {
        const fromGraph = resolveOrgRoleFromGraph(
          org!.employee!.id,
          graph,
          org!.directReports.map((r) => r.id),
        );
        expect(fromGraph.role).toBe(roleState.role);
      }
      expect(report.graphDerivedRoleMatch).toBe(true);
      expect(roleState.ok || roleState.role === "unresolved").toBe(true);
    },
    120_000,
  );
});

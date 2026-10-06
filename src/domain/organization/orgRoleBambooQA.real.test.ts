import { describe, expect, it } from "vitest";
import { getVersion } from "@tauri-apps/api/app";
import { loadPreferences } from "../../platform/preferences";
import {
  formatOrgRoleLabel,
  resolveOrgHierarchyScope,
  resolveOrgRole,
  resolveOrgRoleFromGraph,
} from "./orgRole";
import { buildOrgGraph, rosterFromOrgResolution } from "./orgGraph";

const runReal = process.env.METRIO_ORG_ROLE_QA === "1";

async function isTauriDesktop(): Promise<boolean> {
  try {
    await getVersion();
    return true;
  } catch {
    return false;
  }
}

describe.runIf(runReal)("ORG role real Bamboo QA", () => {
  it("reports safe hierarchy diagnostics for current user", async () => {
    expect(await isTauriDesktop()).toBe(true);
    const prefs = await loadPreferences();
    const org = prefs.teamDetection;
    expect(org?.ok).toBe(true);
    const roleState = resolveOrgRole(org!);
    const hierarchy = resolveOrgHierarchyScope(org!);
    const graph = buildOrgGraph(rosterFromOrgResolution(org!));

    const report = {
      employeeId: org!.employee?.id,
      displayName: org!.employee?.displayName,
      orgRole: formatOrgRoleLabel(roleState.ok ? roleState.role : "unresolved"),
      supervisorId: org!.employee?.supervisorId,
      directReports: org!.directReports.length,
      directManagerReports: hierarchy?.directManagerReportIds.length ?? 0,
      directIndividualContributors: hierarchy?.directIndividualContributorIds.length ?? 0,
      totalDescendants: hierarchy?.descendantIds.length ?? 0,
      maxDepth: hierarchy?.maxDepthBelow ?? 0,
      leadershipBranches: hierarchy?.topLevelManagerBranches.length ?? 0,
      branchLeaders: hierarchy?.topLevelManagerBranches.map((b) => ({
        leaderId: b.managerId,
        people: b.totalPeople,
      })),
    };

    // eslint-disable-next-line no-console
    console.log("[ORG ROLE QA]", JSON.stringify(report, null, 2));

    if (roleState.ok) {
      const fromGraph = resolveOrgRoleFromGraph(
        org!.employee!.id,
        graph,
        org!.directReports.map((r) => r.id),
      );
      expect(fromGraph.role).toBe(roleState.role);
    }
    expect(roleState.ok || roleState.role === "unresolved").toBe(true);
  });
});

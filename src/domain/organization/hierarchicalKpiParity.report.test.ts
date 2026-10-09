/**
 * Deterministic MoM hierarchy QA using the production-path Bamboo fixture.
 * Reports branch vs canonical scoped KPI equality (PASS 15.2 §11).
 */
import { describe, expect, it } from "vitest";
import { buildOrgRoleTeamDetection } from "../../fixtures/orgRoleProductionPathFixture";
import { buildCurrentUserFromTeamDetection } from "../currentUser/fromTeamDetection";
import { resolveAuthorizedPeopleScope } from "./authorizedPeopleScope";
import { rosterFromOrgResolution } from "./orgGraph";
import { buildCanonicalKpiForPersonScope } from "../jira/scopedCanonicalKpi";
import { buildKpiFromIssues, getEfficiencyScoreBreakdown } from "../jira/kpi";
import { collectUniqueTeamIssues } from "../jira/uniqueIssues";
import type { AuditIssue, ReportParams } from "../jira/types";
import type { Person } from "../people/types";
import { testWorkload } from "../testFixtures";
import {
  PERIOD_30D,
  uxHappyPath,
  uxBackflowCycle,
} from "../parity/pass14LegacyParity.fixtures";
import { buildLeadershipBranches } from "./leadershipBranchAggregation";
import { buildOrgGraph } from "./orgGraph";
import { buildDeliveryRiskItems } from "../radar/deliveryRisk";

const PARAMS: ReportParams = { ...PERIOD_30D, targetReviewDays: 3 };

function withRange(issue: AuditIssue): AuditIssue {
  return { ...issue, rangeEvents: issue.events };
}

function person(id: string, issues: AuditIssue[]): Person {
  return {
    id,
    bamboo: {
      id,
      displayName: id,
      firstName: id,
      lastName: "",
      workEmail: `${id}@t.com`,
      jobTitle: "Designer",
    },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: testWorkload({ level: "normal", activeCount: 1 }),
    performance: null,
    issues: issues.map(withRange),
    ownedIssues: [],
  } as Person;
}

describe("PASS 15.2 hierarchical KPI real-hierarchy report", () => {
  it("leaf + MoM + two child branches match canonical scoped calculator", () => {
    const org = buildOrgRoleTeamDetection("mom");
    const user = buildCurrentUserFromTeamDetection(org)!;
    const hierarchy = user.orgHierarchy!;
    // Production fixture "mom" resolves Head→Leads as director/MoM hierarchy with ≥2 branches.
    expect(["manager_of_managers", "director"]).toContain(
      hierarchy.role ?? user.person.role,
    );
    expect(hierarchy.topLevelManagerBranches.length).toBeGreaterThanOrEqual(2);

    const roster = rosterFromOrgResolution(org);
    const branchA = hierarchy.topLevelManagerBranches[0]!;
    const branchB = hierarchy.topLevelManagerBranches[1]!;

    // Attribute UX/AGTC evidence under each branch (mixed workflow projects).
    const issueMap: Record<string, AuditIssue[]> = {
      [branchA.managerId]: [
        withRange({ ...uxHappyPath, issueKey: "UX-A1", projectKey: "UX" }),
      ],
      [branchA.descendantIds.find((id) => id !== branchA.managerId) ?? "ic-a"]: [
        withRange({
          ...uxHappyPath,
          issueKey: "AGTC-A1",
          projectKey: "AGTC",
          issueTypeName: "Task",
        }),
      ],
      [branchB.managerId]: [
        withRange({ ...uxBackflowCycle, issueKey: "UX-B1", projectKey: "UX" }),
      ],
      [branchB.descendantIds.find((id) => id !== branchB.managerId) ?? "ic-b"]: [
        withRange({ ...uxHappyPath, issueKey: "CRC-B1", projectKey: "CRC" }),
      ],
    };

    const allIds = [
      ...new Set([
        ...branchA.descendantIds,
        ...branchB.descendantIds,
        branchA.managerId,
        branchB.managerId,
      ]),
    ];
    const persons = allIds.map((id) => person(id, issueMap[id] ?? []));

    const snapshot = {
      mode: "team" as const,
      persons,
      summary: {
        available: persons.length,
        onVacation: 0,
        vacationSoon: 0,
        highWorkload: 0,
        problematic: 0,
      },
    };
    const deliveryRisk = buildDeliveryRiskItems(snapshot, PARAMS);
    const branches = buildLeadershipBranches({
      branches: hierarchy.topLevelManagerBranches,
      roster,
      persons,
      deliveryRisk,
      graph: buildOrgGraph(roster),
      params: PARAMS,
    });

    const report: Array<Record<string, unknown>> = [];

    for (const branch of branches.slice(0, 2)) {
      const branchPersons = persons.filter((p) =>
        branch.memberIds.includes(p.id),
      );
      const canonical = buildCanonicalKpiForPersonScope({
        persons: branchPersons,
        params: PARAMS,
      });
      const issues = collectUniqueTeamIssues(branchPersons);
      const direct = buildKpiFromIssues(issues, {}, PARAMS);
      const speed = getEfficiencyScoreBreakdown({
        ...canonical,
        targetReviewDays: PARAMS.targetReviewDays,
      });

      expect(branch.metrics.efficiencyIndex).toBe(canonical.efficiencyIndex);
      expect(branch.metrics.efficiencyIndex).toBe(direct.efficiencyIndex);
      expect(branch.metrics.completedCount).toBe(canonical.completedCount);
      expect(branch.metrics.backflowCount).toBe(canonical.backflowCount);

      report.push({
        branch: branch.leaderName,
        people: branch.memberIds,
        projects: [...new Set(issues.map((i) => i.projectKey).filter(Boolean))],
        Efficiency: canonical.efficiencyIndex,
        FirstPass: branch.metrics.firstPassPercent,
        Completed: canonical.completedCount,
        Backflows: canonical.backflowCount,
        speedScore: speed.speedScore,
        branchTotalsMatchCanonical: true,
      });
    }

    // Overall MoM scope
    const scope = resolveAuthorizedPeopleScope(
      org,
      user.person.role,
      [],
      hierarchy,
    );
    const scopedPersons = persons.filter((p) => scope.personIds.includes(p.id));
    const overall = buildCanonicalKpiForPersonScope({
      persons: scopedPersons,
      params: PARAMS,
    });
    const overallDirect = buildKpiFromIssues(
      collectUniqueTeamIssues(scopedPersons),
      {},
      PARAMS,
    );
    expect(overall.efficiencyIndex).toBe(overallDirect.efficiencyIndex);

    report.push({
      branch: "MoM overall",
      people: scopedPersons.map((p) => p.id),
      projects: [
        ...new Set(
          collectUniqueTeamIssues(scopedPersons)
            .map((i) => i.projectKey)
            .filter(Boolean),
        ),
      ],
      Efficiency: overall.efficiencyIndex,
      Completed: overall.completedCount,
      Backflows: overall.backflowCount,
      speedScore: getEfficiencyScoreBreakdown({
        ...overall,
        targetReviewDays: PARAMS.targetReviewDays,
      }).speedScore,
    });

    // Surfaced for packaged/report consumers of test output.
    // eslint-disable-next-line no-console
    console.log("PASS15.2 hierarchical KPI report", JSON.stringify(report, null, 2));
    expect(report.length).toBeGreaterThanOrEqual(3);
  });
});

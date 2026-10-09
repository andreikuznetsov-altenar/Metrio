import { describe, expect, it } from "vitest";
import { buildCanonicalKpiForPersonScope } from "./scopedCanonicalKpi";
import { buildKpiFromIssues, getEfficiencyScoreBreakdown } from "./kpi";
import type { AuditIssue, ReportParams } from "./types";
import type { Person } from "../people/types";
import { testWorkload } from "../testFixtures";
import {
  PERIOD_30D,
  uxHappyPath,
  uxBackflowCycle,
  uxReassigned,
} from "../parity/pass14LegacyParity.fixtures";
import {
  aggregateLeadershipBranchMetrics,
  buildBranchCapacitySummary,
} from "../organization/leadershipBranchAggregation";

const PARAMS: ReportParams = { ...PERIOD_30D };

function personWithIssues(
  id: string,
  issues: AuditIssue[],
  capacityLevel?: string,
): Person {
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
    workload: capacityLevel
      ? testWorkload({
          level: capacityLevel === "Heavy" ? "high" : "normal",
          activeCount: 2,
          capacityDataState: "measured",
        })
      : testWorkload({
          level: "normal",
          activeCount: 1,
          capacityDataState: "insufficient_history",
          capacityBreakdown: {
            completedCyclesInPeriod: 0,
            capacityDataState: "insufficient_history",
          },
        }),
    performance: null,
    issues,
    ownedIssues: [],
  } as Person;
}

function withRange(issue: AuditIssue): AuditIssue {
  return { ...issue, rangeEvents: issue.events };
}

function uxDoneFast(key: string): AuditIssue {
  // Progress→Review within target (speedScore = 30)
  return withRange({
    ...uxHappyPath,
    issueKey: key,
    projectKey: "UX",
    events: [
      {
        eventType: "Status",
        changedAt: "2024-01-03T09:00:00.000Z",
        changedBy: "a",
        fromValue: "To Do",
        toValue: "In Progress",
        timeSincePreviousStatusMs: null,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
      {
        eventType: "Status",
        changedAt: "2024-01-04T09:00:00.000Z",
        changedBy: "a",
        fromValue: "In Progress",
        toValue: "In Review",
        timeSincePreviousStatusMs: 24 * 3600000,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
      {
        eventType: "Status",
        changedAt: "2024-01-05T09:00:00.000Z",
        changedBy: "a",
        fromValue: "In Review",
        toValue: "Done",
        timeSincePreviousStatusMs: 24 * 3600000,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
    ],
  });
}

function uxDoneSlow(key: string): AuditIssue {
  // Progress→Review far beyond target (speedScore = 0)
  const base = uxDoneFast(key);
  return withRange({
    ...base,
    events: [
      base.events[0],
      {
        ...base.events[1],
        changedAt: "2024-01-20T09:00:00.000Z",
        timeSincePreviousStatusMs: 17 * 24 * 3600000,
      },
      {
        ...base.events[2],
        changedAt: "2024-01-21T09:00:00.000Z",
      },
    ],
  });
}

describe("buildCanonicalKpiForPersonScope", () => {
  it("A. same underlying team as regular scope vs leadership branch → same Efficiency", () => {
    const alice = personWithIssues("alice", [withRange(uxHappyPath)]);
    const bob = personWithIssues("bob", [withRange({ ...uxHappyPath, issueKey: "UX-10" })]);
    const team = [alice, bob];

    const asTeam = buildCanonicalKpiForPersonScope({ persons: team, params: PARAMS });
    const asBranch = aggregateLeadershipBranchMetrics({
      descendantIds: ["alice", "bob"],
      persons: team,
      deliveryRisk: [],
      params: PARAMS,
    });

    const direct = buildKpiFromIssues(
      [withRange(uxHappyPath), withRange({ ...uxHappyPath, issueKey: "UX-10" })],
      {},
      PARAMS,
    );

    expect(asTeam.efficiencyIndex).toBe(direct.efficiencyIndex);
    expect(asBranch.efficiencyIndex).toBe(direct.efficiencyIndex);
    expect(asBranch.completedCount).toBe(direct.completedCount);
  });

  it("B. speed score materially affects branch Efficiency", () => {
    const fast = buildCanonicalKpiForPersonScope({
      persons: [personWithIssues("a", [withRange(uxDoneFast("UX-F1"))])],
      params: PARAMS,
    });
    const slow = buildCanonicalKpiForPersonScope({
      persons: [personWithIssues("a", [withRange(uxDoneSlow("UX-S1"))])],
      params: PARAMS,
    });
    const fastBreakdown = getEfficiencyScoreBreakdown({
      ...fast,
      targetReviewDays: PARAMS.targetReviewDays,
    });
    const slowBreakdown = getEfficiencyScoreBreakdown({
      ...slow,
      targetReviewDays: PARAMS.targetReviewDays,
    });
    expect(fastBreakdown.speedScore).toBeGreaterThan(slowBreakdown.speedScore);
    expect(fast.efficiencyIndex).toBeGreaterThan(slow.efficiencyIndex);
  });

  it("C. same backflowCount but different completedCount → rate penalty", () => {
    const oneDone = buildCanonicalKpiForPersonScope({
      persons: [personWithIssues("a", [withRange(uxBackflowCycle)])],
      params: PARAMS,
    });
    const twoDone = buildCanonicalKpiForPersonScope({
      persons: [
        personWithIssues("a", [
          withRange(uxBackflowCycle),
          withRange({ ...uxHappyPath, issueKey: "UX-H2" }),
        ]),
      ],
      params: PARAMS,
    });
    expect(oneDone.backflowCount).toBe(twoDone.backflowCount);
    expect(twoDone.completedCount).toBeGreaterThan(oneDone.completedCount);
    const onePen = getEfficiencyScoreBreakdown({
      ...oneDone,
      targetReviewDays: PARAMS.targetReviewDays,
    }).backflowPenalty;
    const twoPen = getEfficiencyScoreBreakdown({
      ...twoDone,
      targetReviewDays: PARAMS.targetReviewDays,
    }).backflowPenalty;
    expect(onePen).toBeGreaterThan(twoPen);
  });

  it("D. historical reassignment uses attributed issues (not ownedIssues only)", () => {
    // Issue historically on Alice's block even if current assignee is Bob.
    const alice = personWithIssues("alice", [withRange(uxReassigned)]);
    const bob = personWithIssues("bob", [], "Balanced");
    bob.ownedIssues = [withRange(uxReassigned)]; // current ownership only

    const historical = buildCanonicalKpiForPersonScope({
      persons: [alice, bob],
      params: PARAMS,
    });
    const ownedOnly = buildCanonicalKpiForPersonScope({
      persons: [alice, bob],
      params: PARAMS,
      issues: bob.ownedIssues,
    });
    // Canonical path uses person.issues → Alice's historical attribution.
    expect(historical.completedCount).toBe(1);
    expect(ownedOnly.completedCount).toBe(1);
    // Double-counting prevented: same issueKey once even if both lists had it.
    const bothLists = buildCanonicalKpiForPersonScope({
      persons: [
        personWithIssues("alice", [withRange(uxReassigned)]),
        personWithIssues("bob", [withRange(uxReassigned)]),
      ],
      params: PARAMS,
    });
    expect(bothLists.completedCount).toBe(1);
  });

  it("E. mixed workflow projects use each issue's own profile", () => {
    const ux = withRange({ ...uxHappyPath, issueKey: "UX-M1", projectKey: "UX" });
    // AGTC maps to design_review — still a completed cycle path for Task-like flow
    const agtc = withRange({
      ...uxHappyPath,
      issueKey: "AGTC-1",
      projectKey: "AGTC",
      issueTypeName: "Task",
    });
    const kpi = buildCanonicalKpiForPersonScope({
      persons: [personWithIssues("a", [ux, agtc])],
      params: PARAMS,
    });
    const direct = buildKpiFromIssues([ux, agtc], {}, PARAMS);
    expect(kpi.efficiencyIndex).toBe(direct.efficiencyIndex);
    expect(kpi.completedCount).toBe(direct.completedCount);
  });

  it("F. manager-of-managers: two child branches + overall", () => {
    const branchA = [
      personWithIssues("mgr-a", [withRange(uxDoneFast("UX-A1"))]),
      personWithIssues("ic-a1", [withRange(uxDoneFast("UX-A2"))]),
    ];
    const branchB = [
      personWithIssues("mgr-b", [withRange(uxDoneSlow("UX-B1"))]),
      personWithIssues("ic-b1", [withRange(uxBackflowCycle)]),
    ];
    const kpiA = buildCanonicalKpiForPersonScope({ persons: branchA, params: PARAMS });
    const kpiB = buildCanonicalKpiForPersonScope({ persons: branchB, params: PARAMS });
    const overall = buildCanonicalKpiForPersonScope({
      persons: [...branchA, ...branchB],
      params: PARAMS,
    });
    const directOverall = buildKpiFromIssues(
      [
        withRange(uxDoneFast("UX-A1")),
        withRange(uxDoneFast("UX-A2")),
        withRange(uxDoneSlow("UX-B1")),
        withRange(uxBackflowCycle),
      ],
      {},
      PARAMS,
    );
    expect(kpiA.completedCount).toBe(2);
    expect(kpiB.completedCount).toBeGreaterThan(0);
    expect(overall.efficiencyIndex).toBe(directOverall.efficiencyIndex);
    expect(overall.completedCount).toBe(
      kpiA.completedCount + kpiB.completedCount,
    );
  });

  it("G. malformed duplicate hierarchy input → no double count", () => {
    const issue = withRange(uxHappyPath);
    const a = personWithIssues("a", [issue]);
    const kpi = buildCanonicalKpiForPersonScope({
      persons: [a, a, { ...a }],
      params: PARAMS,
    });
    expect(kpi.completedCount).toBe(
      buildKpiFromIssues([issue], {}, PARAMS).completedCount,
    );
  });

  it("H. capacity branch semantics unchanged (distribution, not averaged %)", () => {
    const persons = [
      personWithIssues("a", [], "Heavy"),
      personWithIssues("b", []),
      personWithIssues("c", [], "Balanced"),
    ];
    // Force measured labels via workload shape used by capacityPresentation
    persons[0].workload = {
      ...persons[0].workload!,
      level: "high",
      capacityDataState: "measured",
      capacityLoadPercent: 95,
    };
    persons[2].workload = {
      ...persons[2].workload!,
      level: "normal",
      capacityDataState: "measured",
      capacityLoadPercent: 50,
    };
    const capacity = buildBranchCapacitySummary(persons);
    expect(capacity.totalPeople).toBe(3);
    expect(capacity.insufficientHistoryPeople).toBeGreaterThanOrEqual(1);
    // Must not expose a single averaged capacity percentage field.
    expect(
      Object.keys(capacity).some((k) => /percent|average|avg/i.test(k)),
    ).toBe(false);
  });
});

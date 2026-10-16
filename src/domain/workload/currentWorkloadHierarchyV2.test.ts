import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Person, TeamSnapshot } from "../people/types";
import { buildOrgGraph } from "../organization/orgGraph";
import {
  aggregateCurrentEffort,
  computeOrganizationalTeamEffort,
  computeOrganizationalTeamWorkload,
  currentWorkloadPercent,
  personalCurrentEffort,
  resolveWorkloadUnitForViewer,
  workloadStatusLabelForUnit,
} from "./hierarchicalWorkload";
import { buildWorkloadBalance } from "./workloadBalance";
import { testWorkload } from "../testFixtures";
import { buildLeadershipBranchRow, groupPersonsByLeadershipBranch } from "../organization/leadershipBranches";
import { buildOrganizationSignals } from "../organization/buildOrganizationSignals";
import { aggregateLeadershipBranchMetrics } from "../organization/leadershipBranchAggregation";
import type { DeliveryRiskItem } from "../radar/types";

function person(
  id: string,
  supervisorId: string | undefined,
  expected: number | null,
  available: number | null,
  opts: { activeCount?: number; insufficientHistory?: boolean } = {},
): Person {
  const measured = expected !== null && available !== null;
  const percent = measured && available! > 0 ? (expected! / available!) * 100 : undefined;
  return {
    id,
    bamboo: {
      id,
      displayName: id,
      firstName: id,
      lastName: "Test",
      workEmail: `${id}@co.com`,
      jobTitle: "Designer",
      supervisorId,
      status: "Active",
    },
    jira: null,
    identity: { matchedBy: "unresolved", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: testWorkload({
      level: percent === undefined ? "normal" : percent > 100 ? "overloaded" : percent >= 85 ? "high" : percent >= 50 ? "normal" : "low",
      activeCount: opts.activeCount ?? 1,
      currentLoadPercent: percent,
      expectedEffortHours: measured ? expected! : undefined,
      availableHoursInHorizon: measured ? available! : undefined,
      capacityDataState: opts.insufficientHistory ? "insufficient_history" : "measured",
    }),
    performance: null,
    issues: [],
    ownedIssues: [],
  } as Person;
}

describe("Hierarchical Current workload = Σ expected effort / Σ available hours", () => {
  const effortOf = (persons: Record<string, Person>) => (id: string) => personalCurrentEffort(persons[id]);

  it("weights people by their hours instead of averaging their percentages", () => {
    // lead 100% of 80h, part-timer 25% of 20h => Σ/Σ = 85/100 = 85%, mean of % would be 62.5%.
    const lead = person("lead", undefined, 80, 80);
    const partTimer = person("pt", "lead", 5, 20);
    const persons = { lead, pt: partTimer };
    const graph = buildOrgGraph([lead.bamboo, partTimer.bamboo]);
    expect(computeOrganizationalTeamWorkload("lead", graph, effortOf(persons))).toBeCloseTo(85, 6);
  });

  it("recursive grouping does not affect the result", () => {
    const a = person("a", "m1", 40, 80);
    const b = person("b", "m1", 10, 10);
    const c = person("c", "m2", 70, 70);
    const m1 = person("m1", "dir", 0, 80);
    const m2 = person("m2", "dir", 30, 60);
    const dir = person("dir", undefined, 20, 40);
    const persons = { a, b, c, m1, m2, dir };
    const nested = buildOrgGraph([dir, m1, m2, a, b, c].map((p) => p.bamboo));
    const flatGraph = buildOrgGraph(
      [dir, m1, m2, a, b, c].map((p) => ({ ...p.bamboo, supervisorId: p.id === "dir" ? undefined : "dir" })),
    );
    const viaNested = computeOrganizationalTeamEffort("dir", nested, effortOf(persons))!;
    const viaFlat = computeOrganizationalTeamEffort("dir", flatGraph, effortOf(persons))!;
    expect(viaNested).toEqual(viaFlat);
    expect(currentWorkloadPercent(viaNested)).toBeCloseTo(((40 + 10 + 70 + 0 + 30 + 20) / (80 + 10 + 70 + 80 + 60 + 40)) * 100, 6);

    // Composing sub-team sums equals the flat sum (associativity of Σ/Σ), unlike average-of-averages.
    const m1Effort = computeOrganizationalTeamEffort("m1", nested, effortOf(persons))!;
    const m2Effort = computeOrganizationalTeamEffort("m2", nested, effortOf(persons))!;
    const own = personalCurrentEffort(dir)!;
    expect(m1Effort.expectedEffortHours + m2Effort.expectedEffortHours + own.expectedEffortHours).toBe(viaNested.expectedEffortHours);
    expect(m1Effort.availableHoursInHorizon + m2Effort.availableHoursInHorizon + own.availableHoursInHorizon).toBe(viaNested.availableHoursInHorizon);
  });

  it("counts a person once even when listed twice, and skips people without a measurement", () => {
    const x = person("x", undefined, 40, 80);
    const unknown = person("u", undefined, null, null);
    const persons = { x, u: unknown };
    const total = aggregateCurrentEffort(["x", "x", "u"], effortOf(persons));
    expect(total).toEqual({ expectedEffortHours: 40, availableHoursInHorizon: 80 });
  });

  it("a manager's own load is included once with the descendants", () => {
    const lead = person("lead", undefined, 30, 60);
    const e1 = person("e1", "lead", 30, 60);
    const persons = { lead, e1 };
    const graph = buildOrgGraph([lead.bamboo, e1.bamboo]);
    expect(computeOrganizationalTeamEffort("lead", graph, effortOf(persons))).toEqual({
      expectedEffortHours: 60,
      availableHoursInHorizon: 120,
    });
  });
});

describe("Current workload is never gated by completed-work history", () => {
  it("a person with no completed history still shows their Current workload label and percent", () => {
    const heavy = person("heavy", undefined, 90, 80, { insufficientHistory: true });
    const unit = resolveWorkloadUnitForViewer(heavy, { mode: "own_team" }, (id) => personalCurrentEffort(id === "heavy" ? heavy : undefined));
    expect(unit.currentState).toBe("measured");
    expect(unit.loadPercent).toBeCloseTo(112.5, 6);
    expect(workloadStatusLabelForUnit(unit)).toBe("Overloaded");
  });

  it("manager units aggregate current effort of members without completed history", () => {
    const lead = person("lead", undefined, 0, 80, { insufficientHistory: true });
    const e1 = person("e1", "lead", 120, 80, { insufficientHistory: true });
    const persons = { lead, e1 };
    const graph = buildOrgGraph([lead.bamboo, e1.bamboo]);
    const unit = resolveWorkloadUnitForViewer(lead, { mode: "manager_units", orgGraph: graph }, (id) => personalCurrentEffort(persons[id as keyof typeof persons]));
    expect(unit.kind).toBe("team");
    expect(unit.loadPercent).toBeCloseTo(75, 6);
    expect(unit.currentState).toBe("measured");
  });

  it("Current-workload modules do not consult capacityDataState / insufficient_history", () => {
    const files = [
      "hierarchicalWorkload.ts",
      "workloadBalance.ts",
      "buildTeamWorkloadDonutSegments.ts",
      "workloadDisplay.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), "src/domain/workload", file), "utf8");
      const code = source
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join("\n");
      expect(code, file).not.toMatch(/capacityDataState|insufficient_history|completedCyclesInPeriod/);
    }
  });
});

describe("Workload balance sorts by Current workload, not by task count", () => {
  it("orders by percent / expected effort even when another person has more active tasks", () => {
    const busyButLight = person("busy", undefined, 8, 80, { activeCount: 9 });
    const fewButHeavy = person("heavy", undefined, 96, 80, { activeCount: 1 });
    const middle = person("mid", undefined, 48, 80, { activeCount: 4 });
    const snapshot: TeamSnapshot = {
      mode: "team",
      summary: { available: 3, onVacation: 0, vacationSoon: 0, heavyOrOverloaded: 0, problematic: 0 },
      persons: [busyButLight, middle, fewButHeavy],
    };
    const balance = buildWorkloadBalance(snapshot, (p) => p.id, {
      active: (p) => p.workload?.activeCount ?? 0,
      atRisk: () => 0,
      problematic: () => 0,
    });
    expect(balance.rows.map((r) => r.personId)).toEqual(["heavy", "mid", "busy"]);
    expect(balance.insights[0]!.message).toContain("heavy");
    // Team load is pooled: (8+96+48)/(240) = 63.3%.
    expect(balance.teamCurrentLoadPercent).toBeCloseTo((152 / 240) * 100, 6);
  });
});

describe("Organization dedupe", () => {
  const risk = (issueKey: string, personId: string, severity: DeliveryRiskItem["severity"], extra: Partial<DeliveryRiskItem> = {}) =>
    ({ issueKey, personId, severity, reason: "Review", status: "In Review", stageKind: "review", ...extra }) as DeliveryRiskItem;

  it("a person listed twice and an issue risk listed twice count once in a branch", () => {
    const a = person("a", undefined, 40, 80);
    const metrics = aggregateLeadershipBranchMetrics({
      descendantIds: ["a", "a"],
      persons: [a, a],
      deliveryRisk: [risk("UX-1", "a", "warning"), risk("UX-1", "a", "critical")],
      params: { dateFrom: "2026-01-01", dateTo: "2026-01-31", targetReviewDays: 3, users: [], projects: [] },
    });
    expect(metrics.capacity.totalPeople).toBe(1);
    expect(metrics.uniqueDeliveryRiskCount).toBe(1);
  });

  it("the same issue reported under two owners is one risk in a branch row, at its highest severity", () => {
    const a = person("a", "m", 40, 80);
    const b = person("b", "m", 40, 80);
    const m = person("m", undefined, 0, 80);
    const [group] = groupPersonsByLeadershipBranch({
      branches: [{ managerId: "m", descendantIds: ["m", "a", "b", "a"], totalPeople: 3 }],
      roster: [],
      snapshotPersons: [m, a, b, a],
    });
    expect(group!.persons.map((p) => p.id)).toEqual(["m", "a", "b"]);
    const row = buildLeadershipBranchRow(
      group!,
      [risk("UX-9", "a", "warning"), risk("UX-9", "b", "critical")],
      { dateFrom: "2026-01-01", dateTo: "2026-01-31", targetReviewDays: 3, users: [], projects: [] },
    );
    expect(row.deliveryRiskCount).toBe(1);
    expect(row.attentionCount).toBe(1);
    expect(row.peopleCount).toBe(3);
    expect(row.attentionSeverity).toBe(0);
  });

  it("organization signals count each issue once and use the canonical Review stage", () => {
    const p = person("p1", undefined, 40, 80);
    const items = [
      risk("K-1", "p1", "warning"),
      risk("K-1", "p1", "warning"),
      risk("K-2", "p1", "warning", { status: "Peer Check", stageKind: "review" }),
      risk("K-3", "p1", "warning", { status: "In Review", stageKind: "active" }),
    ];
    const signals = buildOrganizationSignals({
      teams: [{ teamId: "t", teamName: "T", persons: [p] }],
      deliveryRisk: items,
      feedback: { preparedNotSent: false, pendingResponseCount: 0, deliveryFailureCount: 0 },
    });
    expect(signals.find((s) => s.kind === "delivery_risk_concentration")).toBeUndefined(); // 3 unique < 4
    expect(signals.find((s) => s.kind === "review_bottleneck")).toBeUndefined(); // 2 review < 5
  });
});

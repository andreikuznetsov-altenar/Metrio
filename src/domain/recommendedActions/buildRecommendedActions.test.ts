import { describe, expect, it } from "vitest";
import type { ActionItem } from "../actions/actionTypes";
import type { AuditIssue, IssueEvent } from "../jira/types";
import type { WorkloadRow } from "../performance";
import type { PersonAvailability } from "../people/types";
import type { WorkloadResult } from "../workload/workloadEngine";
import {
  MAX_VISIBLE_RECOMMENDED_ACTIONS,
  buildRecommendedActions,
  deliveryRiskConcentration,
  type EmployeeRecommendationInput,
  type TeamLeadRecommendationInput,
} from "./buildRecommendedActions";

const NOW = new Date("2026-10-14T12:00:00.000Z");
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY).toISOString();

function ev(from: string, to: string, changedAt: string): IssueEvent {
  return { eventType: "Status", changedAt, changedBy: "U", fromValue: from, toValue: to, timeSincePreviousStatusMs: null, isBackflow: false, isHandoff: false, isReturnToTeam: false, excludeFromBackflow: false };
}

/** Issue currently in `status`, entered `days` ago. */
function issue(key: string, status: string, days: number): AuditIssue {
  return {
    issueKey: key,
    issueSummary: `Task ${key}`,
    issueCreated: iso(400),
    assigneeName: "A",
    projectKey: "UX",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "",
    epicKey: "",
    epicSummary: "",
    epicStatus: "",
    epicContentType: "",
    epicDesignImprovementType: "",
    events: [ev("In Progress", status, iso(days))],
    rangeEvents: [],
    currentStatus: status,
  } as AuditIssue;
}

const workload = (over: Partial<WorkloadResult> = {}): WorkloadResult =>
  ({ level: "normal", score: 50, activeCount: 3, inProgressCount: 2, inReviewCount: 1, problematicCount: 0, atRiskCount: 0, overdueCount: 0, summary: "", ...over }) as WorkloadResult;

const emp = (over: Partial<EmployeeRecommendationInput> = {}): EmployeeRecommendationInput => ({
  scope: "employee",
  now: NOW,
  ownedIssues: [],
  selfWorkload: workload(),
  ...over,
});

const lead = (over: Partial<TeamLeadRecommendationInput> = {}): TeamLeadRecommendationInput => ({
  scope: "team_lead",
  now: NOW,
  teamIssues: [],
  teamWorkload: [],
  teamActions: [],
  deliveryRiskRows: [],
  ...over,
});

const ids = (list: { id: string }[]) => list.map((a) => a.id);

describe("Recommended Actions — Individual Contributor", () => {
  it("produces nothing when there is nothing to fix", () => {
    expect(buildRecommendedActions(emp())).toEqual([]);
  });

  it("does not fire for Review / Hold at or under 30 days", () => {
    const r = buildRecommendedActions(emp({ ownedIssues: [issue("UX-1", "In Review", 30), issue("UX-2", "On Hold", 12)] }));
    expect(r).toEqual([]);
  });

  it("one stale Review → singular copy, exact issue keys, Review tasks CTA into the task list", () => {
    const [a] = buildRecommendedActions(emp({ ownedIssues: [issue("UX-1", "In Review", 31)] }));
    expect(a).toMatchObject({ id: "stale-review", type: "stale_review", priority: 2, affectedCount: 1, actionLabel: "Review tasks" });
    expect(a!.description).toBe("1 task has been in Review for more than 30 days. Check whether they are still active or complete them.");
    expect(a!.destination).toEqual({ kind: "issue_list", issueKeys: ["UX-1"], title: "In Review for more than 30 days" });
  });

  it("multiple stale Review → plural copy with the exact count", () => {
    const issues = Array.from({ length: 7 }, (_, i) => issue(`UX-${i + 1}`, "In Review", 40 + i));
    const [a] = buildRecommendedActions(emp({ ownedIssues: issues }));
    expect(a!.affectedCount).toBe(7);
    expect(a!.description.startsWith("7 tasks have been in Review for more than 30 days.")).toBe(true);
  });

  it("stale Hold and stale Review are separate actions, Review first only by weight", () => {
    const r = buildRecommendedActions(emp({ ownedIssues: [issue("UX-1", "On Hold", 35), issue("UX-2", "On Hold", 36), issue("UX-3", "In Review", 60)] }));
    expect(ids(r)).toEqual(["stale-review", "stale-hold"]);
    expect(r[1]!.title).toBe("Tasks have been on hold too long");
    expect(r[1]!.description).toBe("2 tasks have been on hold for more than 30 days. Review whether they should remain on hold.");
  });

  it("very stale (>90 days) work is P1 and outranks everything else", () => {
    const r = buildRecommendedActions(emp({ ownedIssues: [issue("UX-1", "In Review", 120)], selfWorkload: workload({ level: "overloaded", activeCount: 9 }) }));
    expect(r[0]).toMatchObject({ id: "stale-review", priority: 1 });
  });

  it("never recommends adding a goal (Bamboo exposes no creation timestamp, so the rule is disabled)", () => {
    const r = buildRecommendedActions(emp({ ownedIssues: [issue("UX-1", "In Review", 45)] }));
    expect(r.every((x) => !/goal/i.test(x.id + x.title + x.description))).toBe(true);
    expect(r.every((x) => x.priority !== 4)).toBe(true);
  });

  it("high workload only for high / overloaded, never for normal", () => {
    expect(buildRecommendedActions(emp({ selfWorkload: workload({ level: "normal" }) }))).toEqual([]);
    const [a] = buildRecommendedActions(emp({ selfWorkload: workload({ level: "high", activeCount: 7 }) }));
    expect(a).toMatchObject({ id: "high-workload", priority: 3, actionLabel: "View work", destination: { kind: "my_work" } });
    expect(a!.description).toContain("7 active tasks");
  });

  it("upcoming leave needs relevant active work", () => {
    const leave: PersonAvailability = { state: "vacation_soon", label: "Vacation soon", isHoliday: false, startDate: "2026-10-19", endDate: "2026-10-23" } as PersonAvailability;
    const [a] = buildRecommendedActions(emp({ selfAvailability: leave, selfWorkload: workload({ activeCount: 3, inReviewCount: 1 }) }));
    expect(a).toMatchObject({ id: "own-leave", priority: 1 });
    expect(a!.description).toBe("Your leave starts in 5 days and you still have 3 active tasks, including 1 in Review.");
    expect(buildRecommendedActions(emp({ selfAvailability: leave, selfWorkload: workload({ activeCount: 0, inReviewCount: 0 }) }))).toEqual([]);
  });

  it("returns the full ordered list; the UI slices it to the visible maximum", () => {
    const r = buildRecommendedActions(
      emp({
        ownedIssues: [issue("UX-1", "In Review", 45), issue("UX-2", "On Hold", 50)],
        selfWorkload: workload({ level: "overloaded", activeCount: 8 }),
      }),
    );
    expect(ids(r)).toEqual(["stale-hold", "stale-review", "high-workload"]);
  });

  it("LIVE: completing stale tasks shrinks then removes the recommendation (pure recompute)", () => {
    const seven = Array.from({ length: 7 }, (_, i) => issue(`UX-${i + 1}`, "In Review", 40));
    expect(buildRecommendedActions(emp({ ownedIssues: seven }))[0]!.affectedCount).toBe(7);
    const afterOne = seven.map((i, idx) => (idx === 0 ? { ...i, currentStatus: "Done", events: [...i.events, ev("In Review", "Done", iso(0))] } : i));
    expect(buildRecommendedActions(emp({ ownedIssues: afterOne }))[0]!.affectedCount).toBe(6);
    const allDone = seven.map((i) => ({ ...i, currentStatus: "Done", events: [...i.events, ev("In Review", "Done", iso(0))] }));
    expect(buildRecommendedActions(emp({ ownedIssues: allDone }))).toEqual([]);
  });
});

describe("stale rule is ONE rule shared with Mark complete (PASS38)", () => {
  it("29 / 30 / 31 days agree between the completion eligibility helper and the recommendation", async () => {
    const { checkStaleReviewOrHold } = await import("../jira/issueCompletion");
    for (const [days, stale] of [[29, false], [30, false], [31, true]] as const) {
      for (const status of ["In Review", "On Hold"]) {
        const i = issue("UX-9", status, days);
        expect(checkStaleReviewOrHold(i, NOW).eligible).toBe(stale);
        expect(buildRecommendedActions(emp({ ownedIssues: [i] })).length > 0).toBe(stale);
        expect(buildRecommendedActions(lead({ teamIssues: [i] })).length > 0).toBe(stale);
      }
    }
  });
});

describe("Recommended Actions — Team Lead", () => {
  const leaveItem = (over: Partial<ActionItem> = {}): ActionItem => ({
    id: "leave-p-nikita-2026-10-19",
    kind: "leave_delivery_risk",
    severity: "warning",
    title: "Upcoming leave with active review work",
    description: "Nikita Volkov · starts in 5 days · 1 active · 1 in review",
    personId: "p-nikita",
    personName: "Nikita Volkov",
    count: 1,
    target: { kind: "person", personId: "p-nikita", tab: "overview" },
    source: "bamboo",
    ...over,
  });
  const row = (personId: string, workload: WorkloadRow["workload"]): WorkloadRow => ({ personId, personName: personId, activeWork: 4, atRisk: 0, workload, availability: "Available" });

  it("team stale Review / Hold route to Delivery Risk with team wording", () => {
    const r = buildRecommendedActions(lead({ teamIssues: [issue("A-1", "In Review", 40), issue("A-2", "In Review", 41), issue("A-3", "On Hold", 33)] }));
    expect(r[0]).toMatchObject({ id: "stale-review", destination: { kind: "delivery_risk" }, actionLabel: "Open Delivery Risk", affectedCount: 2 });
    expect(r[0]!.description).toBe("2 team tasks have been in Review for more than 30 days. Start with the oldest and check whether they can be completed.");
    expect(r[1]).toMatchObject({ id: "stale-hold", title: "A task has been on hold too long" });
    expect(r[1]!.description).toBe("1 team task has been on hold for more than 30 days.");
  });

  it("reuses the existing leave action text and opens the person", () => {
    const [a] = buildRecommendedActions(lead({ teamActions: [leaveItem()] }));
    expect(a).toMatchObject({ id: "leave-p-nikita", priority: 1, title: "Upcoming leave with active review work", actionLabel: "View person", destination: { kind: "person", personId: "p-nikita" } });
    expect(a!.description).toBe("Nikita Volkov · starts in 5 days · 1 active · 1 in review");
  });

  it("capacity uses the shared measured-capacity rule and ignores unmeasured people", () => {
    const [a] = buildRecommendedActions(lead({ teamWorkload: [row("a", "Heavy"), { ...row("b", "Overloaded"), capacityDataState: "insufficient_history" }, row("c", "Balanced")] }));
    expect(a).toMatchObject({ id: "team-capacity", affectedCount: 1, title: "1 team member has elevated measured capacity", destination: { kind: "team_workload" }, actionLabel: "Open Team Workload" });
    const two = buildRecommendedActions(lead({ teamWorkload: [row("a", "Heavy"), row("b", "Overloaded")] }));
    expect(two[0]!.title).toBe("2 team members have elevated measured capacity");
  });

  it("delivery-risk concentration: conservative documented rule", () => {
    const rows = (owners: string[]) => owners.map((o, i) => ({ issueKey: `K-${i}`, ownerId: o, ownerName: o.toUpperCase() }));
    expect(deliveryRiskConcentration(rows(["a", "a", "a", "b"]))).toBeNull(); // top count 3 < 4
    expect(deliveryRiskConcentration(rows(["a", "a", "a", "a", "b", "c", "d", "e", "f"]))).toBeNull(); // 4/9 < 50%
    expect(deliveryRiskConcentration(rows(["a", "a", "a", "a", "b", "c", "d", "e"]))).toEqual({ ownerName: "A", count: 4, total: 8 });
    const [a] = buildRecommendedActions(lead({ deliveryRiskRows: rows(["a", "a", "a", "a", "b", "c", "d", "e"]) }));
    expect(a).toMatchObject({ id: "delivery-risk-concentration", destination: { kind: "delivery_risk" } });
    expect(a!.description).toBe("4 of 8 delivery-risk tasks belong to A.");
  });

  it("multiple conditions sort by priority, then weight; UI shows the top 3", () => {
    const r = buildRecommendedActions(
      lead({
        teamIssues: [issue("A-1", "In Review", 45)],
        teamActions: [leaveItem()],
        teamWorkload: [row("a", "Heavy")],
      }),
    );
    expect(ids(r)).toEqual(["leave-p-nikita", "stale-review", "team-capacity"]);
    expect(r.slice(0, MAX_VISIBLE_RECOMMENDED_ACTIONS)).toHaveLength(3);
  });

  it("is deterministic regardless of input order", () => {
    const a = buildRecommendedActions(lead({ teamIssues: [issue("A-1", "In Review", 45), issue("A-2", "On Hold", 45)], teamWorkload: [row("a", "Heavy")] }));
    const b = buildRecommendedActions(lead({ teamIssues: [issue("A-2", "On Hold", 45), issue("A-1", "In Review", 45)], teamWorkload: [row("a", "Heavy")] }));
    expect(ids(a)).toEqual(ids(b));
  });
});

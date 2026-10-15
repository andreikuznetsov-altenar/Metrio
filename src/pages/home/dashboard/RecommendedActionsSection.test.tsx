import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditIssue, IssueEvent } from "../../../domain/jira/types";
import type { Person } from "../../../domain/people/types";
import type { WorkloadRow } from "../../../domain/performance";
import type { WorkloadResult } from "../../../domain/workload/workloadEngine";
import { RecommendedActionsSection } from "./RecommendedActionsSection";

const appNavigate = vi.fn();
vi.mock("../../../app/navigationStore", () => ({ appNavigate: (...a: unknown[]) => appNavigate(...a) }));
vi.mock("../../../app/PerformanceIssueCatalogContext", () => ({ useOptionalPerformanceIssueCatalog: () => undefined }));
vi.mock("../../../app/TaskJourneyContext", () => ({ useOptionalTaskJourney: () => null }));

const NOW = new Date("2026-10-14T12:00:00.000Z");
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY).toISOString();

function ev(from: string, to: string, changedAt: string): IssueEvent {
  return { eventType: "Status", changedAt, changedBy: "U", fromValue: from, toValue: to, timeSincePreviousStatusMs: null, isBackflow: false, isHandoff: false, isReturnToTeam: false, excludeFromEfficiencyBackflow: false };
}
function issue(key: string, status: string, days: number): AuditIssue {
  return { issueKey: key, issueSummary: `Task ${key}`, issueCreated: iso(400), assigneeName: "A", projectKey: "UX", issueTypeName: "Task", contentType: "none", designImprovementType: "", epicKey: "", epicSummary: "", epicStatus: "", epicContentType: "", epicDesignImprovementType: "", events: [ev("In Progress", status, iso(days))], rangeEvents: [], currentStatus: status } as AuditIssue;
}
const wl = (over: Partial<WorkloadResult> = {}) => ({ level: "normal", score: 50, activeCount: 3, inProgressCount: 2, inReviewCount: 1, problematicCount: 0, atRiskCount: 0, overdueCount: 0, summary: "", ...over }) as WorkloadResult;
function person(issues: AuditIssue[], workload: WorkloadResult = wl()): Person {
  return { id: "p1", bamboo: { id: "b1", displayName: "Maya", firstName: "Maya", lastName: "B", workEmail: "m@altenar.com", jobTitle: "Designer", status: "Active" }, jira: null, identity: { matchedBy: "email", warnings: [] }, availability: { state: "available", label: "Available", isHoliday: false }, workload, performance: null, issues, ownedIssues: issues } as unknown as Person;
}

const handlers = () => ({ onOpenPerson: vi.fn(), onOpenTeamWorkload: vi.fn(), onOpenMyWork: vi.fn() });
const base = { now: NOW };

describe("RecommendedActionsSection (IC)", () => {
  beforeEach(() => appNavigate.mockClear());

  it("renders nothing at all when there is nothing to do (no empty heading)", () => {
    const { container } = render(<RecommendedActionsSection scope="employee" ownPerson={person([])} {...base} {...handlers()} />);
    expect(container.firstChild).toBeNull();
  });

  it("one action = one full-width row with heading, title, description and a named CTA; not a carousel", () => {
    render(<RecommendedActionsSection scope="employee" ownPerson={person([issue("UX-1", "In Review", 45)])} {...base} {...handlers()} />);
    expect(screen.getByRole("heading", { name: "Recommended actions" })).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getByText("Review tasks are getting stale")).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/1 task has been in Review for more than 30 days/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Review tasks: Review tasks are getting stale$/ })).toBeInTheDocument();
    expect(screen.getByTestId("recommended-actions").querySelector("[class*='carousel']")).toBeNull();
  });

  it("Review tasks opens the exact stale tasks in the task list modal", async () => {
    const user = userEvent.setup();
    render(<RecommendedActionsSection scope="employee" ownPerson={person([issue("UX-1", "In Review", 45), issue("UX-2", "On Hold", 50), issue("UX-3", "In Review", 10)])} {...base} {...handlers()} />);
    await user.click(screen.getByTestId("recommended-action-cta-stale-review"));
    const modal = await screen.findByTestId("task-list-modal");
    expect(within(modal).getByText("UX-1")).toBeInTheDocument();
    expect(within(modal).queryByText("UX-3")).toBeNull(); // not stale
    expect(within(modal).queryByText("UX-2")).toBeNull(); // hold is its own recommendation
  });

  it("shows the 3 highest-priority actions and expands in place with 'View all actions (N)'", async () => {
    const user = userEvent.setup();
    const base4 = person([issue("UX-1", "In Review", 45), issue("UX-2", "On Hold", 50)], wl({ level: "overloaded", activeCount: 9, inReviewCount: 1 }));
    const p = { ...base4, availability: { state: "vacation_soon", label: "Vacation soon", isHoliday: false, startDate: "2026-10-19", endDate: "2026-10-23" } } as unknown as Person;
    render(<RecommendedActionsSection scope="employee" ownPerson={p} {...base} {...handlers()} />);
    // leave (P1, review work, 5 days) → stale hold / stale review (P2, by age) ; workload (P3) is the 4th
    expect(screen.getAllByRole("listitem").map((li) => li.getAttribute("data-testid"))).toEqual([
      "recommended-action-own-leave",
      "recommended-action-stale-hold",
      "recommended-action-stale-review",
    ]);
    const toggle = screen.getByTestId("recommended-actions-toggle");
    expect(toggle).toHaveTextContent("View all actions (4)");
    await user.click(toggle);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByTestId("recommended-action-high-workload")).toBeInTheDocument();
  });

  it("View work routes to the user's own Work view", async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(<RecommendedActionsSection scope="employee" ownPerson={person([], wl({ level: "high", activeCount: 7 }))} {...base} {...h} />);
    await user.click(screen.getByRole("button", { name: /^View work/ }));
    expect(h.onOpenMyWork).toHaveBeenCalledTimes(1);
  });

  it("LIVE: the same section updates 7 → 6 → gone when tasks are completed, without remounting", () => {
    const seven = Array.from({ length: 7 }, (_, i) => issue(`UX-${i + 1}`, "In Review", 40));
    const { rerender } = render(<RecommendedActionsSection scope="employee" ownPerson={person(seven)} {...base} {...handlers()} />);
    expect(screen.getByText(/7 tasks have been in Review/)).toBeInTheDocument();
    const done = (i: AuditIssue): AuditIssue => ({ ...i, currentStatus: "Done", events: [...i.events, ev("In Review", "Done", iso(0))] });
    rerender(<RecommendedActionsSection scope="employee" ownPerson={person([done(seven[0]!), ...seven.slice(1)])} {...base} {...handlers()} />);
    expect(screen.getByText(/6 tasks have been in Review/)).toBeInTheDocument();
    rerender(<RecommendedActionsSection scope="employee" ownPerson={person(seven.map(done))} {...base} {...handlers()} />);
    expect(screen.queryByTestId("recommended-actions")).toBeNull();
  });

  it("stores nothing: no read/dismiss state exists (no persistence keys written)", () => {
    const before = Object.keys(localStorage).length;
    render(<RecommendedActionsSection scope="employee" ownPerson={person([issue("UX-1", "In Review", 45)])} {...base} {...handlers()} />);
    fireEvent.click(screen.getByTestId("recommended-action-cta-stale-review"));
    expect(Object.keys(localStorage).length).toBe(before);
  });
});

describe("RecommendedActionsSection (Team Lead)", () => {
  beforeEach(() => appNavigate.mockClear());
  const row = (personId: string, workload: WorkloadRow["workload"]): WorkloadRow => ({ personId, personName: personId, activeWork: 4, atRisk: 0, workload, availability: "Available" });
  const leave = { id: "leave-p-nikita-2026-10-19", kind: "leave_delivery_risk" as const, severity: "warning" as const, title: "Upcoming leave with active review work", description: "Nikita Volkov · starts in 5 days · 1 active · 1 in review", personId: "p-nikita", personName: "Nikita Volkov", count: 1, target: { kind: "person" as const, personId: "p-nikita" } };
  const lead = (extra = {}) => ({
    scope: "team_lead" as const,
    ownPerson: person([]),
    teamPersons: [person([issue("A-1", "In Review", 45)])],
    teamWorkload: [row("a", "Heavy")],
    teamActions: [leave],
    deliveryRiskRows: [] as never[],
    ...base,
    ...extra,
  });

  it("shows at most 3, priority-sorted; toggle reveals the rest in place", async () => {
    const user = userEvent.setup();
    const props = lead({
      teamPersons: [person([issue("A-1", "In Review", 45), issue("A-2", "On Hold", 40)])],
      deliveryRiskRows: ["a", "a", "a", "a", "b", "c", "d", "e"].map((o, i) => ({ issueKey: `K-${i}`, issueTitle: "t", ownerId: o, ownerName: o, age: "1", status: "x", riskReason: "r" })),
    });
    render(<RecommendedActionsSection {...props} {...handlers()} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    // P1 leave first, then P2 stale items
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("data-testid", "recommended-action-leave-p-nikita");
    const toggle = screen.getByTestId("recommended-actions-toggle");
    expect(toggle).toHaveTextContent(/View all actions \(\d+\)/);
    await user.click(toggle);
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(3);
    expect(screen.getByTestId("recommended-actions-toggle")).toHaveTextContent("Show fewer actions");
  });

  it("CTAs route to the intended surface", async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(<RecommendedActionsSection {...lead()} {...h} />);
    await user.click(screen.getByRole("button", { name: /^View person/ }));
    expect(h.onOpenPerson).toHaveBeenCalledWith("p-nikita");
    await user.click(screen.getByRole("button", { name: /^Open Team Workload/ }));
    expect(h.onOpenTeamWorkload).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /^Open Delivery Risk/ }));
    expect(appNavigate).toHaveBeenCalledWith({ route: "performance", performanceView: "delivery-risk" });
  });
});

import { describe, expect, it } from "vitest";
import {
  checkStaleReviewOrHold,
  getCurrentCanonicalStageEnteredAt,
  parseJiraTransitions,
  selectCompletionOptions,
  type JiraTransition,
} from "./issueCompletion";
import { applyVerifiedIssueState } from "./applyVerifiedIssueState";
import type { AuditIssue, IssueEvent } from "./types";

const NOW = new Date("2026-10-14T12:00:00.000Z");
const DAY = 86_400_000;
const iso = (daysAgo: number, extraMs = 0) => new Date(NOW.getTime() - daysAgo * DAY - extraMs).toISOString();

function ev(from: string, to: string, changedAt: string): IssueEvent {
  return {
    eventType: "Status",
    changedAt,
    changedBy: "U",
    fromValue: from,
    toValue: to,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

function issue(over: Partial<AuditIssue> & { status: string; events?: IssueEvent[] }): AuditIssue {
  const { status, events, ...rest } = over;
  return {
    issueKey: "UX-123",
    issueSummary: "Stale thing",
    issueCreated: iso(200),
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
    events: events ?? [],
    rangeEvents: [],
    currentStatus: status,
    ...rest,
  };
}

const t = (id: string, to: string, extra: Partial<JiraTransition> = {}): JiraTransition => ({
  id,
  name: `to ${to}`,
  to: { name: to },
  ...extra,
});

describe("current-stage age (eligibility)", () => {
  it("A. Review 31d with a valid transition is eligible", () => {
    const i = issue({ status: "In Review", events: [ev("In Progress", "In Review", iso(31))] });
    expect(checkStaleReviewOrHold(i, NOW).eligible).toBe(true);
    expect(selectCompletionOptions(i, [t("1", "Done")])).toHaveLength(1);
  });
  it("B. Hold 45d is eligible", () => {
    const i = issue({ status: "On Hold", events: [ev("In Progress", "On Hold", iso(45))] });
    const c = checkStaleReviewOrHold(i, NOW);
    expect(c.stage).toBe("hold");
    expect(c.eligible).toBe(true);
  });
  it("C. exactly 30 days is NOT stale; any positive excess is", () => {
    const exact = issue({ status: "In Review", events: [ev("In Progress", "In Review", iso(30))] });
    expect(checkStaleReviewOrHold(exact, NOW).eligible).toBe(false);
    const plus = issue({ status: "In Review", events: [ev("In Progress", "In Review", iso(30, 1))] });
    expect(checkStaleReviewOrHold(plus, NOW).eligible).toBe(true);
  });
  it("D. Review 12 days is hidden", () => {
    const i = issue({ status: "In Review", events: [ev("In Progress", "In Review", iso(12))] });
    expect(checkStaleReviewOrHold(i, NOW).eligible).toBe(false);
  });
  it("E. In Progress 60 days is hidden", () => {
    const i = issue({ status: "In Progress", events: [ev("To Do", "In Progress", iso(60))] });
    expect(checkStaleReviewOrHold(i, NOW).eligible).toBe(false);
  });
  it("F. Done is hidden", () => {
    const i = issue({ status: "Done", events: [ev("In Review", "Done", iso(60))] });
    expect(checkStaleReviewOrHold(i, NOW).eligible).toBe(false);
  });
  it("age means time in the CURRENT stage, not issue age", () => {
    const i = issue({
      issueCreated: iso(400),
      status: "In Review",
      events: [ev("To Do", "In Progress", iso(300)), ev("In Progress", "In Review", iso(5))],
    });
    expect(checkStaleReviewOrHold(i, NOW).eligible).toBe(false);
  });
  it("stage time is continuous across raw statuses of the same canonical stage", () => {
    const i = issue({
      status: "In Review",
      events: [
        ev("In Progress", "Review", iso(50)),
        ev("Review", "In Review", iso(10)),
      ],
    });
    expect(getCurrentCanonicalStageEnteredAt(i, checkProfile(i))).toBe(iso(50));
  });
  it("hides the action when entry time cannot be established reliably", () => {
    const none = issue({ status: "In Review", events: [] });
    expect(checkStaleReviewOrHold(none, NOW).eligible).toBe(false);
    const mismatch = issue({ status: "In Review", events: [ev("To Do", "In Progress", iso(90))] });
    expect(checkStaleReviewOrHold(mismatch, NOW).eligible).toBe(false);
    const rangeOnly = issue({ status: "In Review", events: [], rangeEvents: [ev("A", "In Review", iso(90))] });
    expect(checkStaleReviewOrHold(rangeOnly, NOW).eligible).toBe(false);
  });
});

import { resolveWorkflowProfile } from "../workflows/resolveWorkflowProfile";
function checkProfile(i: AuditIssue) {
  return resolveWorkflowProfile(i);
}

describe("terminal-success target selection", () => {
  it("G. no successful transition → no options", () => {
    const i = issue({ status: "In Review" });
    expect(selectCompletionOptions(i, [t("1", "In Progress"), t("2", "On Hold")])).toEqual([]);
    expect(selectCompletionOptions(i, [])).toEqual([]);
  });
  it("H. only a Cancelled transition → no options", () => {
    const i = issue({ status: "In Review" });
    expect(selectCompletionOptions(i, [t("2", "Cancelled")])).toEqual([]);
  });
  it("workflow 1: UX Task Review → Done", () => {
    const i = issue({ status: "In Review", projectKey: "UX", issueTypeName: "Task" });
    expect(selectCompletionOptions(i, [t("1", "Done")])).toEqual([{ transitionId: "1", targetStatus: "Done" }]);
  });
  it("workflow 2: AGP (classic review) Review → Closed", () => {
    const i = issue({ status: "In Review", projectKey: "AGP", issueTypeName: "Task" });
    expect(selectCompletionOptions(i, [t("7", "Closed")])).toEqual([{ transitionId: "7", targetStatus: "Closed" }]);
  });
  it("workflow 3: ARCH (governance) Hold → Approved", () => {
    const i = issue({ status: "On Hold", projectKey: "ARCH", issueTypeName: "Task" });
    expect(selectCompletionOptions(i, [t("9", "Approved")])).toEqual([{ transitionId: "9", targetStatus: "Approved" }]);
  });
  it("workflow 4: Cancelled is canonical non-success in every workflow", () => {
    for (const projectKey of ["UX", "AGP", "ARCH"]) {
      const i = issue({ status: "In Review", projectKey });
      expect(selectCompletionOptions(i, [t("2", "Cancelled")])).toEqual([]);
    }
  });
  it("offers every distinct valid success target and keeps Jira's human status names", () => {
    const i = issue({ status: "In Review", projectKey: "UX" });
    const out = selectCompletionOptions(i, [t("1", "Done"), t("2", "Cancelled"), t("3", "Done"), t("5", "In Progress")]);
    expect(out.map((o) => o.transitionId)).toEqual(["1", "3"]);
  });
  it("excludes transitions that require fields Metrio cannot supply", () => {
    const i = issue({ status: "In Review" });
    const needsResolution = t("4", "Done", { fields: { resolution: { required: true, hasDefaultValue: true } } });
    const optional = t("5", "Done", { fields: { comment: { required: false } } });
    expect(selectCompletionOptions(i, [needsResolution])).toEqual([]);
    expect(selectCompletionOptions(i, [needsResolution, optional]).map((o) => o.transitionId)).toEqual(["5"]);
  });
});

describe("parseJiraTransitions", () => {
  it("parses Jira's payload and ignores malformed entries", () => {
    const parsed = parseJiraTransitions({
      transitions: [
        { id: "31", name: "Close", to: { id: "6", name: "Closed" }, hasScreen: false, fields: {} },
        { id: 12, name: "x", to: { name: "Done" } },
        { name: "no id", to: { name: "Done" } },
        { id: "9" },
      ],
    });
    expect(parsed.map((p) => [p.id, p.to.name])).toEqual([["31", "Closed"], ["12", "Done"]]);
    expect(parseJiraTransitions(null)).toEqual([]);
  });
});

describe("applyVerifiedIssueState", () => {
  it("sets Jira's status and appends only newer status events", () => {
    const i = issue({ status: "In Review", events: [ev("In Progress", "In Review", iso(45))] });
    const out = applyVerifiedIssueState(i, {
      issueKey: "UX-123",
      currentStatus: "Closed",
      statusEvents: [ev("In Progress", "In Review", iso(45)), ev("In Review", "Closed", iso(0))],
    });
    expect(out.currentStatus).toBe("Closed");
    expect(out.events.filter((e) => e.eventType === "Status")).toHaveLength(2);
    expect(out.events[1]!.toValue).toBe("Closed");
  });
});

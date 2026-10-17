import { describe, expect, it } from "vitest";
import { buildEmployeeDailyBrief } from "./buildEmployeeDailyBrief";
import { EMPTY_JIRA_ASSIGNMENT_STATE } from "../jira/jiraAssignmentTracking";
import type { Person } from "../people/types";

describe("buildEmployeeDailyBrief", () => {
  it("lists unread assignments factually", () => {
    const person = {
      id: "p1",
      bamboo: { displayName: "Alex" },
      availability: { state: "available", label: "Available" },
    } as Person;
    const brief = buildEmployeeDailyBrief({
      selfPerson: person,
      employeeSnapshot: {
        personId: "p1",
        metrics: [],
        cycleTime: [],
        activeWork: [],
        attention: [],
        timeOff: undefined,
        trends: [],
        myWeek: {
          summary: {
            completedThisWeek: 2,
            currentlyActive: 3,
            atRisk: 0,
            inReview: 1,
            backflowsThisWeek: 0,
          },
          needsAttention: [],
          inProgress: [],
          inReview: [],
          completedThisWeek: [],
          completedCount: 2,
        },
        historyWeek: [],
        historyMonth: [],
        historyQuarter: [],
      },
      assignmentState: {
        ...EMPTY_JIRA_ASSIGNMENT_STATE,
        baselineComplete: true,
        records: {
          "UX-1": {
            issueKey: "UX-1",
            title: "Nav",
            type: "jira_assignment",
            assignedAt: "2026-10-02T10:00:00.000Z",
          },
        },
      },
      now: new Date("2026-10-02T12:00:00.000Z"),
    });
    expect(brief.kind).toBe("daily");
    expect(brief.plainText).toContain("UX-1");
    expect(brief.plainText).not.toMatch(/performed poorly/i);
  });

  it("reports completed work as completed cycles, the same number as the My Week card", () => {
    const person = {
      id: "p1",
      bamboo: { displayName: "Alex" },
      availability: { state: "available", label: "Available" },
    } as Person;
    const brief = buildEmployeeDailyBrief({
      selfPerson: person,
      employeeSnapshot: {
        personId: "p1", metrics: [], cycleTime: [], activeWork: [], attention: [], timeOff: undefined,
        trends: [],
        myWeek: {
          summary: { completedThisWeek: 3, currentlyActive: 0, atRisk: 0, inReview: 0, backflowsThisWeek: 0 },
          needsAttention: [], inProgress: [], inReview: [],
          // Two issues, one of them completed twice: three completed cycles.
          completedThisWeek: [{ key: "UX-1", title: "A" }, { key: "UX-7", title: "B", completions: 2 }],
          completedCount: 3,
        },
        historyWeek: [], historyMonth: [], historyQuarter: [],
      },
      assignmentState: { ...EMPTY_JIRA_ASSIGNMENT_STATE, baselineComplete: true, records: {} },
      now: new Date("2026-10-02T12:00:00.000Z"),
    });
    expect(brief.plainText).toContain("3 completed this week");
    expect(brief.plainText).not.toContain("2 completed this week");
  });
});

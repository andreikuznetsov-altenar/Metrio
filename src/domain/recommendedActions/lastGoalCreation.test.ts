import { describe, expect, it } from "vitest";
import type { BambooGoal } from "../goals/bambooGoalTypes";
import type { Goal } from "../goals/goalTypes";
import { lastGoalCreatedAt } from "./lastGoalCreation";

const bg = (over: Partial<BambooGoal>): BambooGoal => ({
  id: "g",
  employeeId: "e1",
  title: "G",
  percentComplete: 0,
  status: "in_progress",
  sharedWithEmployeeIds: [],
  milestones: [],
  hasMilestones: false,
  setDate: "2026-01-10",
  startDateIsExplicit: false,
  ...over,
});
const local = (over: Partial<Goal>): Goal =>
  ({ id: "l", title: "L", ownerPersonId: "p1", scope: "person", status: "active", progressMode: "manual", linkedJiraIssueKeys: [], linkedJiraProjectKeys: [], linkedConfluencePageIds: [], employeeMayEditManualProgress: true, createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", ...over }) as Goal;

describe("lastGoalCreatedAt", () => {
  it("uses the newest CREATED date across Bamboo and Metrio goals, never updates", () => {
    const d = lastGoalCreatedAt({
      bamboo: { goals: [bg({ setDate: "2026-01-10" }), bg({ id: "g2", setDate: "2026-02-20" })], state: "ready" },
      localGoals: [local({ createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" })],
      ownerPersonId: "p1",
    });
    expect(d?.toISOString().slice(0, 10)).toBe("2026-03-01");
  });
  it("is unknown (null) when Bamboo is not authoritative", () => {
    expect(lastGoalCreatedAt({ bamboo: { goals: [], state: "error" }, localGoals: [local({})], ownerPersonId: "p1" })).toBeNull();
    expect(lastGoalCreatedAt({ bamboo: { goals: [], state: "loading" }, localGoals: [], ownerPersonId: "p1" })).toBeNull();
  });
  it("is unknown when any goal only has an explicit start date (creation date not known)", () => {
    expect(lastGoalCreatedAt({ bamboo: { goals: [bg({ startDateIsExplicit: true })], state: "ready" }, localGoals: [], ownerPersonId: "p1" })).toBeNull();
  });
  it("ignores other owners' and team goals, and returns null with no goals", () => {
    expect(lastGoalCreatedAt({ bamboo: { goals: [], state: "empty" }, localGoals: [local({ ownerPersonId: "other" }), local({ scope: "team" })], ownerPersonId: "p1" })).toBeNull();
  });
  it("works without Bamboo (Metrio goals only)", () => {
    expect(lastGoalCreatedAt({ bamboo: null, localGoals: [local({})], ownerPersonId: "p1" })?.toISOString().slice(0, 10)).toBe("2026-03-01");
  });
});

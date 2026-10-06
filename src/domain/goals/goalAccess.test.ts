import { describe, expect, it } from "vitest";
import {
  canCreateGoalForOwner,
  canViewGoal,
  listVisibleGoals,
} from "./goalAccess";
import type { Goal } from "./goalTypes";
import type { CurrentUser } from "../types";

const baseGoal = (overrides: Partial<Goal>): Goal => ({
  id: "g1",
  title: "Test",
  ownerPersonId: "emp-1",
  scope: "person",
  status: "active",
  progressMode: "linked_work",
  linkedJiraIssueKeys: [],
  linkedJiraProjectKeys: [],
  linkedConfluencePageIds: [],
  employeeMayEditManualProgress: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const manager: CurrentUser = {
  person: { id: "mgr-1", name: "Mgr", role: "lead" },
  team: { leadId: "mgr-1", directReportIds: ["emp-1"] },
};

const employee: CurrentUser = {
  person: { id: "emp-1", name: "Emp", role: "employee" },
};

describe("goalAccess", () => {
  it("employee sees own goals", () => {
    const goal = baseGoal({ ownerPersonId: "emp-1" });
    expect(canViewGoal(employee, goal)).toBe(true);
  });

  it("blocks indirect report for manager", () => {
    const goal = baseGoal({ ownerPersonId: "emp-2" });
    expect(canViewGoal(manager, goal)).toBe(false);
  });

  it("manager sees direct report goals", () => {
    const goal = baseGoal({ ownerPersonId: "emp-1" });
    expect(canViewGoal(manager, goal)).toBe(true);
  });

  it("manager can create team goal", () => {
    expect(canCreateGoalForOwner(manager, manager.person.id, "team")).toBe(true);
  });

  it("listVisibleGoals filters inaccessible", () => {
    const goals = [
      baseGoal({ id: "a", ownerPersonId: "emp-1" }),
      baseGoal({ id: "b", ownerPersonId: "emp-2" }),
    ];
    expect(listVisibleGoals(goals, manager)).toHaveLength(1);
  });

  it("manager of managers does not inherit descendant goals from org tree scope", () => {
    const head: CurrentUser = {
      person: { id: "head", name: "Head", role: "director" },
      orgRole: "manager_of_managers",
      team: { leadId: "head", directReportIds: ["lead-a", "lead-b"] },
    };
    const nestedIcGoal = baseGoal({ ownerPersonId: "emp-deep" });
    expect(canViewGoal(head, nestedIcGoal)).toBe(false);
    expect(listVisibleGoals([nestedIcGoal], head)).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildTraySummaryModel,
  dedupeIssueKeys,
  indexLabelForRole,
  trayTitleForUnreadCount,
} from "./buildTraySummaryModel";
import {
  buildTraySummaryFromPerformance,
  countScopedProblemTasks,
} from "./buildTraySummaryFromPerformance";
import type { DeliveryRiskRow } from "../performance";

describe("buildTraySummaryModel", () => {
  it("omits tray title when unread is zero", () => {
    expect(trayTitleForUnreadCount(0)).toBeUndefined();
    const model = buildTraySummaryModel({
      role: "employee",
      openTaskCount: 2,
      problemTaskCount: 1,
      indexLabel: "Personal index",
      indexValue: "Healthy",
      indexAvailable: true,
      unreadNotificationCount: 0,
    });
    expect(model.trayTitle).toBeUndefined();
  });

  it("shows tray title digits for unread notifications", () => {
    expect(trayTitleForUnreadCount(4)).toBe("4");
    const model = buildTraySummaryModel({
      role: "manager",
      openTaskCount: 0,
      problemTaskCount: 0,
      indexLabel: "Team index",
      indexValue: "Steady",
      indexAvailable: true,
      unreadNotificationCount: 3,
    });
    expect(model.trayTitle).toBe("3");
  });

  it("uses role-specific index labels", () => {
    expect(indexLabelForRole("employee")).toBe("Personal index");
    expect(indexLabelForRole("manager")).toBe("Team index");
    expect(indexLabelForRole("director")).toBe("Organization index");
  });
});

describe("buildTraySummaryFromPerformance", () => {
  const deliveryRisk: DeliveryRiskRow[] = [
    {
      issueKey: "UX-1",
      title: "A",
      ownerId: "p1",
      ownerName: "A",
      status: "Review",
      age: "3 days",
      riskReason: "Long review",
    },
    {
      issueKey: "UX-1",
      title: "A",
      ownerId: "p1",
      ownerName: "A",
      status: "Review",
      age: "3 days",
      riskReason: "Long review",
    },
  ];

  it("deduplicates problem tasks by issueKey", () => {
    expect(countScopedProblemTasks(deliveryRisk)).toBe(1);
  });

  it("uses personal open tasks for employee scope", () => {
    const model = buildTraySummaryFromPerformance(
      {
        homeRole: "employee",
        teamSnapshot: null,
        employeeActiveSummaryValue: "5",
        deliveryRisk: [],
        scopeHealthEvidence: {
          role: "employee",
          focusCount: 0,
          deliveryRiskCount: 0,
          selfWorkload: null,
        },
      },
      2,
    );
    expect(model.openTaskCount).toBe(5);
    expect(model.indexLabel).toBe("Personal index");
    expect(model.trayTitle).toBe("2");
  });

  it("sums team workload for manager scope", () => {
    const model = buildTraySummaryFromPerformance(
      {
        homeRole: "manager",
        teamSnapshot: {
          workload: [
            {
              personId: "p1",
              activeWork: 3,
              atRisk: 0,
              workload: "Moderate",
              availability: "Available",
              capacityDataState: "measured",
            },
            {
              personId: "p2",
              activeWork: 2,
              atRisk: 1,
              workload: "Heavy",
              availability: "Available",
              capacityDataState: "measured",
            },
          ],
        } as never,
        deliveryRisk,
        scopeHealthEvidence: {
          role: "manager",
          focusCount: 0,
          deliveryRiskCount: 1,
          teamWorkload: [],
        },
      },
      0,
    );
    expect(model.openTaskCount).toBe(5);
    expect(model.problemTaskCount).toBe(1);
    expect(model.indexLabel).toBe("Team index");
  });
});

describe("dedupeIssueKeys", () => {
  it("removes duplicate keys", () => {
    expect(dedupeIssueKeys(["UX-1", "UX-1", "UX-2"])).toEqual(["UX-1", "UX-2"]);
  });
});

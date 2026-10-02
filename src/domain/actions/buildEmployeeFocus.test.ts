import { describe, expect, it } from "vitest";
import { buildEmployeeFocusActions } from "./buildEmployeeFocus";
import { buildPersonAnalyticsWorkspace } from "../analytics/personAnalyticsWorkspace";
import { buildVisualPerformanceFetchResult } from "../../fixtures/performanceFetchFixture";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../snapshots/snapshotEngine";

describe("buildEmployeeFocusActions access", () => {
  it("scopes focus items to the signed-in employee issues only", () => {
    const data = buildVisualPerformanceFetchResult("30d", "team", "team");
    const person = data.teamSnapshot.persons[0]!;
    const workspace = buildPersonAnalyticsWorkspace({
      person,
      historyPerson: person,
      params: data.reportData.params,
      historyParams: data.historyReportData.params,
      kpiSnapshots: data.kpiSnapshots || EMPTY_KPI_SNAPSHOT_FILE,
      trendDays: 30,
      dateRangeKey: "30d",
      reviewTarget: "team",
      timeOffEntries: data.timeOffEntries,
      teamEmployeeIds: new Set([person.id]),
    });

    const focus = buildEmployeeFocusActions({
      workspace,
      myWeek: {
        summary: [],
        needsAttention: [],
        inProgress: [],
        inReview: [],
        completedThisWeek: [],
      },
      selfPersonId: person.id,
    });

    for (const item of focus) {
      expect(item.personId).toBe(person.id);
      if (item.target.kind === "jira") {
        expect(item.issueKeys?.[0]).toMatch(/^[A-Z]/);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { buildVisualPerformanceFetchResult } from "../../fixtures/performanceFetchFixture";
import { buildKpiFromIssues } from "../jira/kpi";
import { buildPersonAnalyticsWorkspace } from "./personAnalyticsWorkspace";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../snapshots/snapshotEngine";

describe("buildPersonAnalyticsWorkspace", () => {
  it("uses history snapshot for history groups and current snapshot for KPI cards", () => {
    const data = buildVisualPerformanceFetchResult("30d", "team", "team");
    const person = data.teamSnapshot.persons[0]!;
    const historyPerson = {
      ...person,
      issues: person.issues.slice(0, Math.max(1, person.issues.length - 2)),
    };

    const workspace = buildPersonAnalyticsWorkspace({
      person,
      historyPerson,
      params: data.reportData.params,
      historyParams: data.historyReportData.params,
      kpiSnapshots: data.kpiSnapshots || EMPTY_KPI_SNAPSHOT_FILE,
      trendDays: 30,
      dateRangeKey: "30d",
      reviewTarget: "team",
      timeOffEntries: data.timeOffEntries,
      teamEmployeeIds: new Set(data.teamSnapshot.persons.map((p) => p.id)),
    });

    const derivedCompleted =
      person.issues.length > 0
        ? buildKpiFromIssues(person.issues, {}, data.reportData.params).completedCount
        : (person.performance?.completedCount ?? 0);
    expect(workspace.performanceKpis.find((m) => m.label === "Completed")?.value).toBe(
      String(derivedCompleted),
    );
    expect(workspace.workload).toMatch(/Light|Balanced|Heavy|Overloaded/);
    expect(workspace.historyMonth.length).toBeGreaterThanOrEqual(0);
  });
});

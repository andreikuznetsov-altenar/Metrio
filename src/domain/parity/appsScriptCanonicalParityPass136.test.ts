import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { reconcileAnalyticsKpiEvidence } from "../analytics/kpiReconciliation";
import { buildKpiFromIssues, getEfficiencyScoreBreakdown } from "../jira/kpi";
import type { AuditReportData } from "../jira/types";
import { calculateCapacityBreakdown, capacityLevelFromPercent } from "../workflows/capacityWorkload";
import { buildWskinsKpiFromIssues } from "../workflows/wskinsKpi";
import { calculateWskinsEfficiencyIndex } from "../workflows/wskinsEfficiency";
import { MONTHLY_CAPACITY_HOURS } from "../workflows/capacityWorkload";
import { buildTeamWorkloadDonutSegments, workloadDonutWeight } from "../workload/buildTeamWorkloadDonutSegments";
import type { WorkloadRow } from "../performance";

const CANONICAL_APPS_SCRIPT_DIR = join(
  process.cwd(),
  "docs/canonical-legacy/apps-script",
);
const CODE_GS = join(CANONICAL_APPS_SCRIPT_DIR, "Code.gs");
const WS_GS = join(CANONICAL_APPS_SCRIPT_DIR, "WskinsAudit.gs");

function readCanonicalSource(path: string, marker: string): string {
  const content = readFileSync(path, "utf8");
  expect(content.includes(marker), `Canonical source missing marker ${marker} in ${path}`).toBe(
    true,
  );
  expect(content.includes("{\\rtf"), `RTF markup leaked into ${path}`).toBe(false);
  return content;
}

export interface ParityRow {
  metric: string;
  canonical: string;
  metrio: string;
  result: "PASS" | "FAIL" | "SKIP";
  note?: string;
}

function statusEvent(changedAt: string, fromValue: string, toValue: string) {
  return {
    eventType: "Status" as const,
    changedAt,
    changedBy: "User",
    fromValue,
    toValue,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

describe("Pass 13.6 Apps Script canonical parity matrix", () => {
  it("records parity rows for required metrics against local canonical sources", () => {
    const rows: ParityRow[] = [];

    readCanonicalSource(CODE_GS, "calculateEfficiencyIndex_");
    readCanonicalSource(WS_GS, "calculateWSkinsEfficiencyIndex_");

    rows.push({
      metric: "Canonical UX Code.gs",
      canonical: "readable",
      metrio: "src/domain/jira/kpi.ts",
      result: "PASS",
      note: "docs/canonical-legacy/apps-script/Code.gs",
    });
    rows.push({
      metric: "Canonical WSkins WskinsAudit.gs",
      canonical: "readable",
      metrio: "src/domain/workflows/wskinsKpi.ts",
      result: "PASS",
      note: "docs/canonical-legacy/apps-script/WskinsAudit.gs",
    });

    const uxBreakdown = getEfficiencyScoreBreakdown({
      startedCount: 10,
      completedCount: 8,
      firstPassAcceptedCount: 6,
      backflowCount: 2,
      avgProgressToReviewMs: 2.5 * 24 * 3600000,
      targetReviewDays: 3,
    });
    const uxLegacyTotal =
      Math.round((8 / 10) * 35) +
      Math.round((6 / 8) * 35) +
      30 -
      Math.min(20, Math.round((2 / 8) * 20));
    rows.push({
      metric: "UX Efficiency Index",
      canonical: String(uxLegacyTotal),
      metrio: String(uxBreakdown.total),
      result: uxBreakdown.total === uxLegacyTotal ? "PASS" : "FAIL",
    });

    const params = {
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      targetReviewDays: 3,
      users: ["alex"],
      projects: [],
    };
    const events = [
      statusEvent("2024-01-02T09:00:00.000Z", "To Do", "In Progress"),
      statusEvent("2024-01-03T09:00:00.000Z", "In Progress", "Review"),
      statusEvent("2024-01-10T09:00:00.000Z", "Review", "Done"),
    ];
    const issue = {
      issueKey: "UX-1",
      issueSummary: "S",
      issueCreated: "2024-01-01T10:00:00.000Z",
      assigneeName: "Alex",
      issueTypeName: "Task",
      contentType: "none",
      designImprovementType: "none",
      epicKey: "none",
      epicSummary: "none",
      epicStatus: "none",
      epicContentType: "none",
      epicDesignImprovementType: "none",
      currentStatus: "Done",
      events,
      rangeEvents: events,
    };
    const teamKpi = buildKpiFromIssues([issue], {}, params);
    const reportData: AuditReportData = {
      params,
      grouped: {
        alex: {
          requestedUser: "alex",
          userLabel: "Alex",
          issues: [issue],
          transitionStats: {},
        },
      },
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi,
      perUserKpi: { alex: teamKpi },
    };
    const reconciliation = reconcileAnalyticsKpiEvidence(reportData, "team");
    rows.push({
      metric: "KPI reconciliation bundle",
      canonical: "allMatch",
      metrio: String(reconciliation.allMatch),
      result: reconciliation.allMatch ? "PASS" : "FAIL",
    });
    for (const metric of ["Completed", "First pass", "Backflows", "Efficiency"] as const) {
      const row = reconciliation.results.find((r) => r.metric === metric);
      rows.push({
        metric,
        canonical: row?.evidenceValue ?? "n/a",
        metrio: row?.dashboardValue ?? "n/a",
        result: row?.matches ? "PASS" : row ? "FAIL" : "SKIP",
      });
    }

    const capacity = calculateCapacityBreakdown({
      issues: [],
      params,
    });
    const legacyPercent =
      MONTHLY_CAPACITY_HOURS > 0
        ? Math.round((capacity.estimatedMonthlyHours / MONTHLY_CAPACITY_HOURS) * 1000) / 10
        : 0;
    rows.push({
      metric: "Team Workload capacity %",
      canonical: String(legacyPercent),
      metrio: String(capacity.capacityLoadPercent),
      result: capacity.capacityLoadPercent === legacyPercent ? "PASS" : "FAIL",
    });
    rows.push({
      metric: "Workload level thresholds",
      canonical: "low/normal/high/overloaded",
      metrio: [
        capacityLevelFromPercent(40),
        capacityLevelFromPercent(60),
        capacityLevelFromPercent(90),
        capacityLevelFromPercent(110),
      ].join("/"),
      result:
        capacityLevelFromPercent(110) === "overloaded" &&
        capacityLevelFromPercent(40) === "low"
          ? "PASS"
          : "FAIL",
    });

    const wskins = buildWskinsKpiFromIssues([], params);
    const wskinsEff = calculateWskinsEfficiencyIndex({
      startedCount: 0,
      reviewSubmittedCount: 0,
      completedCount: 0,
      backflowCount: 0,
      avgProgressToReviewMs: null,
      targetReviewDays: 3,
    });
    rows.push({
      metric: "WSkins efficiency empty activity",
      canonical: "0",
      metrio: String(wskinsEff.total),
      result: wskinsEff.total === 0 ? "PASS" : "FAIL",
    });
    rows.push({
      metric: "WSkins KPI empty set",
      canonical: "0 completed",
      metrio: String(wskins.completedCount),
      result: wskins.completedCount === 0 ? "PASS" : "FAIL",
    });

    const workloadRow: WorkloadRow = {
      personId: "p1",
      activeWork: 4,
      atRisk: 1,
      workload: "Overloaded",
      availability: "Available",
      capacityDataState: "measured",
      capacityLoadPercent: 103,
    };
    rows.push({
      metric: "Team Brief workload donut weight",
      canonical: "103",
      metrio: String(workloadDonutWeight(workloadRow)),
      result: workloadDonutWeight(workloadRow) === 103 ? "PASS" : "FAIL",
    });
    rows.push({
      metric: "Team Brief donut segments",
      canonical: "1 segment",
      metrio: String(buildTeamWorkloadDonutSegments([workloadRow]).length),
      result: buildTeamWorkloadDonutSegments([workloadRow]).length === 1 ? "PASS" : "FAIL",
    });

    const failures = rows.filter((r) => r.result === "FAIL");
    if (failures.length) {
      console.table(rows);
    }
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });
});

import { createPerformanceDateRange } from "../../domain/performance/performanceDateRange";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../../domain/snapshots/snapshotEngine";
import { testKpi } from "../../domain/testFixtures";
import type { PerformanceFetchResult } from "../../services/performance/performanceTypes";
import type { TeamSnapshot } from "../../domain/people/types";
import type { AuditReportData } from "../../domain/jira/types";
import { emptyDependencyIndex } from "../../domain/dependencies/buildDeliveryDependencyGraph";

const emptyTeam: TeamSnapshot = {
  mode: "personal",
  persons: [],
  summary: {
    available: 0,
    onVacation: 0,
    vacationSoon: 0,
    highWorkload: 0,
    problematic: 0,
  },
};

const emptyReport: AuditReportData = {
  params: {
    dateFrom: "2026-01-01",
    dateTo: "2026-03-01",
    targetReviewDays: 3,
    users: [],
    projects: [],
  },
  grouped: {},
  totalTransitions: 0,
  teamSummaryColumns: [],
  teamKpi: testKpi(),
  perUserKpi: {},
};

export function performanceDataLifecycleEmptyResult(): PerformanceFetchResult {
  return {
    teamSnapshot: emptyTeam,
    historyTeamSnapshot: emptyTeam,
    reportData: emptyReport,
    historyReportData: emptyReport,
    kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
    reportParams: emptyReport.params,
    reportRanges: resolvePerformanceReportRanges(
      createPerformanceDateRange("30d"),
      "team",
      "team",
      3,
    ),
    identityResolution: [],
    timeOffEntries: [],
    partialWarnings: [],
    lastUpdatedAt: "2026-03-01T12:00:00.000Z",
    historicalBootstrapRan: false,
    dependencyIndex: emptyDependencyIndex(),
  };
}

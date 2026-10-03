import type { AuditReportData } from "../../domain/jira/types";
import type { TimeOffEntry } from "../../domain/people/availability";
import type { PersonIdentityDiagnostics } from "../../domain/people/types";
import type { TeamSnapshot } from "../../domain/people/types";
import type { KpiSnapshotFile } from "../../domain/snapshots/types";
import type { PerformanceReportRanges } from "../../domain/performance/reportParams";
import type { DeliveryDependencyIndex } from "../../domain/dependencies/dependencyTypes";

export interface PerformanceIdentityResolution {
  employeeId: string;
  displayName: string;
  workEmail: string;
  matched: boolean;
  matchedBy: PersonIdentityDiagnostics["matchedBy"];
  warnings: string[];
}

export interface PerformanceFetchResult {
  teamSnapshot: TeamSnapshot;
  historyTeamSnapshot: TeamSnapshot;
  reportData: AuditReportData;
  historyReportData: AuditReportData;
  kpiSnapshots: KpiSnapshotFile;
  reportParams: AuditReportData["params"];
  reportRanges: PerformanceReportRanges;
  identityResolution: PerformanceIdentityResolution[];
  timeOffEntries: TimeOffEntry[];
  partialWarnings: string[];
  lastUpdatedAt: string;
  historicalBootstrapRan: boolean;
  dependencyIndex: DeliveryDependencyIndex;
}

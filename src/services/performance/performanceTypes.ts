import type { AuditReportData } from "../../domain/jira/types";
import type { TimeOffEntry } from "../../domain/people/availability";
import type { PersonIdentityDiagnostics } from "../../domain/people/types";
import type { TeamSnapshot } from "../../domain/people/types";
import type { KpiSnapshotFile } from "../../domain/snapshots/types";

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
  reportData: AuditReportData;
  kpiSnapshots: KpiSnapshotFile;
  reportParams: AuditReportData["params"];
  identityResolution: PerformanceIdentityResolution[];
  timeOffEntries: TimeOffEntry[];
  partialWarnings: string[];
  lastUpdatedAt: string;
}

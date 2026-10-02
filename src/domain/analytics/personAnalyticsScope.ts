import type { AuditReportData } from "../jira/types";
import type { Person } from "../people/types";
import { personRouteKey } from "../people/personDisplay";

export function resolvePersonReportKey(person: Person): string {
  return personRouteKey(person);
}

export function personIssuesFromReport(
  reportData: AuditReportData,
  personReportKey: string,
) {
  return reportData.grouped[personReportKey]?.issues ?? [];
}

export function personKpiFromReport(
  reportData: AuditReportData,
  personReportKey: string,
) {
  return reportData.perUserKpi[personReportKey] ?? null;
}

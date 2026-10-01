import { buildFirstPassRateMetrics } from "../../domain/jira/firstPass";
import type { PerformanceAudience } from "../../domain/performance/reportParams";
import { loadPreferences } from "../../platform/preferences";
import type { PerformanceFetchResult } from "../performance/performanceTypes";
import { buildPerformanceExportData } from "./buildPerformanceExportData";
import type { PerformanceExportView } from "./types";

function teamScopeLabel(
  audience: PerformanceAudience,
  reportRanges: PerformanceFetchResult["reportRanges"],
): string | undefined {
  if (audience !== "team") {
    return undefined;
  }
  return reportRanges.teamScope === "full"
    ? "Full reporting tree"
    : "Direct reports only";
}

export async function buildPerformanceExportPayloadFromFetch(input: {
  data: PerformanceFetchResult;
  view: PerformanceExportView;
  audience: PerformanceAudience;
  selfPersonId: string;
  workHistoryPeriod?: "week" | "month" | "quarter";
}): Promise<ReturnType<typeof buildPerformanceExportData>> {
  const { data, view, audience, selfPersonId, workHistoryPeriod } = input;
  const prefs = await loadPreferences();
  const firstPassMetrics = buildFirstPassRateMetrics(data.reportData);

  const displaySnapshot =
    audience === "employee"
      ? {
          ...data.teamSnapshot,
          mode:
            data.teamSnapshot.mode === "team"
              ? ("personal" as const)
              : data.teamSnapshot.mode,
          persons: data.teamSnapshot.persons.filter(
            (person) => person.id === selfPersonId,
          ),
          summary: data.teamSnapshot.summary,
        }
      : data.teamSnapshot;

  const historyPerson =
    data.historyTeamSnapshot.persons.find(
      (person) => person.id === selfPersonId,
    ) ?? displaySnapshot.persons[0];

  return buildPerformanceExportData({
    view,
    snapshot: displaySnapshot,
    reportData: data.reportData,
    historyReportData: data.historyReportData,
    kpiSnapshots: data.kpiSnapshots,
    firstPassMetrics,
    prefs,
    historyPerson,
    workHistoryPeriod,
    teamScopeLabel: teamScopeLabel(audience, data.reportRanges),
  });
}

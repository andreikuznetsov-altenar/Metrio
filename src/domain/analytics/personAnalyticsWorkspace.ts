import { format, parseISO } from "date-fns";
import type { BadgeVariant } from "../../components/Badge/Badge";
import { getEfficiencyStatus } from "../jira/kpi";
import { formatDuration } from "../jira/dates";
import type { AuditIssue, ReportParams } from "../jira/types";
import type { Person } from "../people/types";
import { buildPlannedTimeOffRows, type PlannedTimeOffRow } from "../people/plannedTimeOff";
import {
  avgCycleSegments,
  firstPassPercent,
  formatWorkloadLabel,
  personActiveCount,
} from "../people/personDisplay";
import { buildWorkHistory, type WorkHistoryPeriod } from "../personal/workHistory";
import type {
  DateRangeKey,
  MetricCardData,
  PerformanceReviewTarget,
  PersonalAttentionItem,
  TrendCardData,
  WorkHistoryGroupView,
} from "../performance";
import {
  comparisonPeriodLabel,
  formatPerformanceDateDisplay,
  performanceDateRangeFromPresetKey,
  type PerformanceDateRange,
} from "../performance/performanceDateRange";
import {
  classifyIssueAttention,
  formatStageAgeLabel,
  getActiveIssues,
} from "../radar/taskSignals";
import { classifyTaskHealth } from "../task-health/taskHealthEngine";
import type { OperationalRules } from "../operationalRules/operationalRulesTypes";
import { DEFAULT_OPERATIONAL_RULES } from "../operationalRules/operationalRulesDefaults";
import { getOperationalIssues } from "../people/ownedIssues";
import {
  availabilityHeadline,
  formatLeaveRangeLabel,
  isUpcomingLeaveState,
} from "../availability/leaveCalendar";
import { personAvailabilityDrawerLine } from "../availability/personAvailabilityCopy";
import type { TimeOffEntry } from "../people/availability";
import type { KpiSnapshotFile } from "../snapshots/types";
import {
  compareTrendPeriods,
  compareWeightedAvgCycleTrend,
  compareWeightedFirstPassTrend,
} from "../trends/trendEngine";
import {
  personSparklinePoints,
  personTrendPoints,
} from "../snapshots/snapshotEngine";
import { sparklineValuesFromPoints } from "../snapshots/sparklineSeries";
import {
  buildTrendCardData,
  formatAttentionHealthLabel,
  metricContextFromComparison,
} from "../../pages/performance/trendPresentation";
import { targetScopeLabel } from "./analyticsReportScope";
import type { AnalyticsEvidenceIssue } from "./analyticsEvidenceTypes";

export interface PersonWorkRowData {
  key: string;
  title: string;
  status: string;
  stageAge: string;
  healthVariant: BadgeVariant;
}

export interface PersonAnalyticsWorkspace {
  personId: string;
  personName: string;
  role: string;
  availability: string;
  workload: string;
  contextLine: string;
  /** Core performance outcome KPIs (Efficiency, First pass, Completed, Backflows). */
  performanceKpis: MetricCardData[];
  /** Segment cycle-time presentation (not a headline KPI). */
  cycleTime: { label: string; value: string }[];
  /** Active task count for operational summaries (Work tab / context). */
  activeWorkCount: number;
  trends: TrendCardData[];
  attention: PersonalAttentionItem[];
  workRows: PersonWorkRowData[];
  problematicWork: PersonWorkRowData[];
  timeOff?: {
    rangeLabel: string;
    note: string;
    startDate?: string;
    endDate?: string;
    headline?: string;
  };
  historyWeek: WorkHistoryGroupView[];
  historyMonth: WorkHistoryGroupView[];
  historyQuarter: WorkHistoryGroupView[];
}

export interface BuildPersonAnalyticsWorkspaceInput {
  person: Person;
  historyPerson: Person;
  params: ReportParams;
  historyParams: ReportParams;
  kpiSnapshots: KpiSnapshotFile;
  trendDays: number;
  dateRangeKey: DateRangeKey;
  displayRange?: PerformanceDateRange;
  reviewTarget: PerformanceReviewTarget;
  timeOffEntries: TimeOffEntry[];
  teamEmployeeIds: Set<string>;
  operationalRules?: OperationalRules;
}

function efficiencyStatusVariant(score: number): BadgeVariant {
  const status = getEfficiencyStatus(score);
  if (status === "Excellent" || status === "Healthy") return "success";
  if (status === "Watch") return "warning";
  return "danger";
}

function severityToBadge(severity: import("../radar/types").RadarSeverity): BadgeVariant {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "neutral";
}

function mapWorkHistoryGroups(
  person: Person,
  params: ReportParams,
  period: WorkHistoryPeriod,
): WorkHistoryGroupView[] {
  return buildWorkHistory(person, params, period).map((group) => ({
    label: group.label,
    completedCount: group.completedCount,
    firstPassCount: group.firstPassCount,
    reviewReturns: group.reviewReturns,
    rows: group.entries.map((entry) => ({
      key: entry.issueKey,
      title: entry.summary,
      project: entry.project,
      completedOn: entry.completedAt
        ? format(parseISO(entry.completedAt), "dd MMM yyyy")
        : "—",
      cycle: entry.cycleMs != null ? formatDuration(entry.cycleMs) : "—",
      outcome: entry.firstPass ? "First pass" : "Rework",
      completedAtIso: entry.completedAt,
      cycleMs: entry.cycleMs,
      firstPass: entry.firstPass,
    })),
  }));
}

export function auditIssueToPersonWorkRow(
  issue: AuditIssue,
  params: ReportParams,
  now: Date,
): PersonWorkRowData {
  const health = classifyTaskHealth({ issue, params, now });
  return {
    key: issue.issueKey,
    title: issue.issueSummary,
    status: issue.currentStatus || "—",
    stageAge: formatStageAgeLabel(issue, now),
    healthVariant:
      health.status === "problematic"
        ? "danger"
        : health.status === "at_risk"
          ? "warning"
          : "neutral",
  };
}

function buildPersonTrendCards(
  personId: string,
  kpiSnapshots: KpiSnapshotFile,
  trendDays: number,
): TrendCardData[] {
  const completedTrend = compareTrendPeriods(
    personTrendPoints(kpiSnapshots, personId, "completedOnDate"),
    "completed",
    trendDays,
  );
  const firstPassTrend = compareWeightedFirstPassTrend(
    personTrendPoints(kpiSnapshots, personId, "completedOnDate"),
    personTrendPoints(kpiSnapshots, personId, "firstPassOnDate"),
    trendDays,
  );
  const avgCycleTrend = compareWeightedAvgCycleTrend(
    personTrendPoints(kpiSnapshots, personId, "cycleMsSumOnDate"),
    personTrendPoints(kpiSnapshots, personId, "completedWithCycleOnDate"),
    trendDays,
  );
  const backflowTrend = compareTrendPeriods(
    personTrendPoints(kpiSnapshots, personId, "backflowsOnDate"),
    "backflows",
    trendDays,
  );
  const sparkCompleted = sparklineValuesFromPoints(
    personSparklinePoints(kpiSnapshots, personId, "completedOnDate"),
  );
  const sparkBackflows = sparklineValuesFromPoints(
    personSparklinePoints(kpiSnapshots, personId, "backflowsOnDate"),
  );

  return [
    buildTrendCardData("Completed", completedTrend, {
      sparkline: sparkCompleted,
      trendMetricKind: "count",
    }),
    buildTrendCardData("First pass", firstPassTrend, {
      trendMetricKind: "percent",
    }),
    buildTrendCardData("Avg cycle", avgCycleTrend, {
      trendMetricKind: "duration",
    }),
    buildTrendCardData("Backflows", backflowTrend, {
      sparkline: sparkBackflows,
      trendMetricKind: "count",
    }),
  ];
}

export function workHistoryEntryToEvidenceIssue(
  entry: ReturnType<typeof buildWorkHistory>[number]["entries"][number],
  personId: string,
  personName: string,
): AnalyticsEvidenceIssue {
  return {
    issueKey: entry.issueKey,
    title: entry.summary,
    personId,
    personName,
    projectKey: entry.project,
    completedAt: entry.completedAt,
    cycleDurationMs: entry.cycleMs,
    outcome: entry.firstPass ? "first_pass" : "rework",
  };
}

export function buildPersonAnalyticsContextLine(
  params: ReportParams,
  reviewTarget: PerformanceReviewTarget,
  dateRangeKey: DateRangeKey,
  displayRange?: PerformanceDateRange,
): string {
  const rangeLabel = `${formatPerformanceDateDisplay(params.dateFrom)} – ${formatPerformanceDateDisplay(params.dateTo)}`;
  const comparisonLabel = displayRange
    ? comparisonPeriodLabel(displayRange)
    : comparisonPeriodLabel(performanceDateRangeFromPresetKey(dateRangeKey));
  return [rangeLabel, targetScopeLabel(reviewTarget), comparisonLabel]
    .filter(Boolean)
    .join("  ·  ");
}

function buildPersonTimeOffContext(
  person: Person,
  personTimeOff: PlannedTimeOffRow | undefined,
  now: Date,
): PersonAnalyticsWorkspace["timeOff"] {
  const avail = person.availability;
  if (avail.state === "on_vacation") {
    const range =
      formatLeaveRangeLabel(avail.startDate, avail.endDate) || avail.label;
    return {
      rangeLabel: range,
      note: avail.returnDate ? `Returns ${avail.returnDate}` : "",
      startDate: avail.startDate,
      endDate: avail.endDate,
      headline: availabilityHeadline(avail, now),
    };
  }
  if (isUpcomingLeaveState(avail.state) && avail.startDate) {
    const range =
      formatLeaveRangeLabel(avail.startDate, avail.endDate) ||
      personTimeOff?.rangeLabel ||
      avail.label;
    return {
      rangeLabel: range,
      note: availabilityHeadline(avail, now),
      startDate: avail.startDate,
      endDate: avail.endDate,
      headline: availabilityHeadline(avail, now),
    };
  }
  if (personTimeOff) {
    return {
      rangeLabel: personTimeOff.rangeLabel,
      note: personTimeOff.typeLabel,
      startDate: personTimeOff.start,
      endDate: personTimeOff.end,
      headline: availabilityHeadline(avail, now),
    };
  }
  return undefined;
}

export function buildPersonAnalyticsWorkspace(
  input: BuildPersonAnalyticsWorkspaceInput,
): PersonAnalyticsWorkspace {
  const operationalRules = input.operationalRules ?? DEFAULT_OPERATIONAL_RULES;
  const {
    person,
    historyPerson,
    params,
    historyParams,
    kpiSnapshots,
    trendDays,
    dateRangeKey,
    displayRange,
    reviewTarget,
    timeOffEntries,
    teamEmployeeIds,
  } = input;

  const perf = person.performance;
  const now = new Date();
  const trendContextLabel = displayRange
    ? comparisonPeriodLabel(displayRange)
    : undefined;

  const completedTrend = compareTrendPeriods(
    personTrendPoints(kpiSnapshots, person.id, "completedOnDate"),
    "completed",
    trendDays,
  );
  const firstPassTrend = compareWeightedFirstPassTrend(
    personTrendPoints(kpiSnapshots, person.id, "completedOnDate"),
    personTrendPoints(kpiSnapshots, person.id, "firstPassOnDate"),
    trendDays,
  );
  const backflowTrend = compareTrendPeriods(
    personTrendPoints(kpiSnapshots, person.id, "backflowsOnDate"),
    "backflows",
    trendDays,
  );

  const summaryKpis: MetricCardData[] = [
    {
      label: "Efficiency",
      value: perf ? `${perf.efficiencyIndex}%` : "—",
      status: perf ? getEfficiencyStatus(perf.efficiencyIndex) : undefined,
      statusVariant: perf ? efficiencyStatusVariant(perf.efficiencyIndex) : undefined,
    },
    {
      label: "First pass",
      value: `${firstPassPercent(person)}%`,
      ...metricContextFromComparison(firstPassTrend, dateRangeKey, trendContextLabel),
    },
    {
      label: "Completed",
      value: perf ? String(perf.completedCount) : "0",
      ...metricContextFromComparison(completedTrend, dateRangeKey, trendContextLabel),
    },
    {
      label: "Backflows",
      value: perf ? String(perf.backflowCount) : "0",
      ...metricContextFromComparison(backflowTrend, dateRangeKey, trendContextLabel),
    },
  ];

  const cycleTime = avgCycleSegments(person);
  const activeWorkCount = personActiveCount(person, params);

  const activeIssues = getActiveIssues(person, params);
  const attention: PersonalAttentionItem[] = activeIssues
    .map((issue) => {
      const item = classifyIssueAttention(issue, params, now, operationalRules);
      if (!item) return null;
      return {
        label: formatAttentionHealthLabel(item.health.status),
        variant: severityToBadge(item.severity),
        reason: item.reason,
        issueKey: issue.issueKey,
      };
    })
    .filter((item) => item != null)
    .slice(0, 24);

  const workRows = activeIssues.slice(0, 24).map((issue) => auditIssueToPersonWorkRow(issue, params, now));
  const problematicWork = getOperationalIssues(person)
    .filter(
      (issue) => classifyTaskHealth({ issue, params, now }).status === "problematic",
    )
    .slice(0, 12)
    .map((issue) => auditIssueToPersonWorkRow(issue, params, now));

  const plannedTimeOff = buildPlannedTimeOffRows(timeOffEntries, teamEmployeeIds);
  const personTimeOff = plannedTimeOff.find((row) => row.employeeId === person.id);
  const timeOff = buildPersonTimeOffContext(person, personTimeOff, now);

  return {
    personId: person.id,
    personName: person.bamboo.displayName,
    role: person.bamboo.jobTitle || "—",
    availability: personAvailabilityDrawerLine(person.availability, now),
    workload: formatWorkloadLabel(person.workload?.level),
    contextLine: buildPersonAnalyticsContextLine(
      params,
      reviewTarget,
      dateRangeKey,
      displayRange,
    ),
    performanceKpis: summaryKpis,
    cycleTime,
    activeWorkCount,
    trends: buildPersonTrendCards(person.id, kpiSnapshots, trendDays),
    attention,
    workRows,
    problematicWork,
    timeOff,
    historyWeek: mapWorkHistoryGroups(historyPerson, historyParams, "week"),
    historyMonth: mapWorkHistoryGroups(historyPerson, historyParams, "month"),
    historyQuarter: mapWorkHistoryGroups(historyPerson, historyParams, "quarter"),
  };
}

import { format, parseISO } from "date-fns";
import type { BadgeVariant } from "../../components/Badge/Badge";
import { getEfficiencyStatus } from "../../domain/jira/kpi";
import { formatDuration } from "../../domain/jira/dates";
import type { AuditReportData } from "../../domain/jira/types";
import type { Person } from "../../domain/people/types";
import { buildPlannedTimeOffRows } from "../../domain/people/plannedTimeOff";
import {
  avgCycleLabel,
  firstPassPercent,
  formatWorkloadLabel,
  personActiveCount,
  personAtRiskCount,
  personProblematicCount,
  workloadLabelForPerson,
  buildWorkloadRowFields,
} from "../../domain/people/personDisplay";
import { buildMyWeek } from "../../domain/personal/myWeek";
import { buildWorkHistory } from "../../domain/personal/workHistory";
import type {
  ActiveWorkItem,
  AttentionPerson,
  DateRangeKey,
  DeliveryRiskRow,
  EmployeeCompletedRowView,
  EmployeeMyWeekSnapshot,
  EmployeePerformanceSnapshot,
  EmployeeWorkRowView,
  MetricCardData,
  PersonDetailSnapshot,
  PersonPerformanceDetail,
  TeamPerformanceSnapshot,
  TeamPeopleRow,
  TeamRadarRow,
  TeamSecondarySnapshot,
  TrendCardData,
  WorkloadRow,
  TimeOffEntry as UiTimeOffEntry,
} from "../../domain/performance";
import type { AuditIssue } from "../../domain/jira/types";
import { classifyTaskHealth } from "../../domain/task-health/taskHealthEngine";
import { buildDeliveryRiskItems } from "../../domain/radar/deliveryRisk";
import { buildTeamRadar } from "../../domain/radar/teamRadar";
import { readDashboardVisualQueryFlag } from "../../fixtures/dashboardVisualOverrides";
import type { OperationalRules } from "../../domain/operationalRules/operationalRulesTypes";
import { DEFAULT_OPERATIONAL_RULES } from "../../domain/operationalRules/operationalRulesDefaults";
import type { RadarSeverity } from "../../domain/radar/types";
import {
  classifyIssueAttention,
  getActiveIssues,
} from "../../domain/radar/taskSignals";
import {
  compareTrendPeriods,
  compareWeightedAvgCycleTrend,
  compareWeightedFirstPassTrend,
  trendSufficiency,
} from "../../domain/trends/trendEngine";
import {
  teamSparklinePoints,
  teamTrendPoints,
} from "../../domain/snapshots/snapshotEngine";
import {
  sparklineValuesFromPoints,
  teamAvgCycleDaysSparklinePoints,
  teamFirstPassRateSparklinePoints,
} from "../../domain/snapshots/sparklineSeries";
import {
  buildTrendCardData,
  formatAttentionHealthLabel,
  metricContextFromComparison,
} from "../../pages/performance/trendPresentation";
import { buildWorkloadBalance } from "../../domain/workload/workloadBalance";
import { personRouteKey } from "../../domain/people/personDisplay";
import type { PerformanceReviewTarget } from "../../domain/performance";
import { buildPersonAnalyticsWorkspace, auditIssueToPersonWorkRow, type PersonAnalyticsWorkspace } from "../../domain/analytics/personAnalyticsWorkspace";
import {
  getIssueCompletionAt,
  getIssueFullCycleMs,
  withFullIssueHistory,
} from "../../domain/periods/issueCompletion";
import type { PerformanceFetchResult } from "./performanceTypes";
import { getOperationalIssues } from "../../domain/people/ownedIssues";
import {
  comparisonPeriodLabel,
  trendComparisonDayCount,
  type PerformanceDateRange,
} from "../../domain/performance/performanceDateRange";
function efficiencyStatusVariant(score: number): BadgeVariant {
  const status = getEfficiencyStatus(score);
  if (status === "Excellent" || status === "Healthy") return "success";
  if (status === "Watch") return "warning";
  return "danger";
}

function sparklineValues(points: { value: number }[]): number[] {
  return sparklineValuesFromPoints(points);
}

function attentionReasonFromSignal(label: string): string {
  const parts = label.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : label;
}

const ATTENTION_OVERVIEW_LIMIT = 5;

function applyVisualGroupedTasksFixture(
  radar: ReturnType<typeof buildTeamRadar>,
): ReturnType<typeof buildTeamRadar> {
  if (!readDashboardVisualQueryFlag("visualGroupedTasks") || radar.length === 0) {
    return radar;
  }
  const keys = Array.from({ length: 10 }, (_, index) => `UX-${2960 + index}`);
  return radar.map((item, index) =>
    index === 0 ? { ...item, relatedIssueKeys: keys, signalCount: keys.length } : item,
  );
}

function mapAttentionPerson(
  item: ReturnType<typeof buildTeamRadar>[number],
  teamSnapshot: PerformanceFetchResult["teamSnapshot"],
): AttentionPerson {
  const person = findPerson(teamSnapshot, item.personId);
  const primary = item.signals[0];
  return {
    personId: item.personId,
    personName: item.personName,
    personRole: person?.bamboo.jobTitle || undefined,
    reason: primary ? attentionReasonFromSignal(primary.label) : "Needs review",
    severity: item.severity,
    issueKeys: item.relatedIssueKeys,
    issueCount: item.relatedIssueKeys.length || item.signalCount,
    workload: workloadLabelForPerson(person),
  };
}

function radarSeverityLabel(severity: RadarSeverity): string {
  if (severity === "critical") return "High";
  if (severity === "warning") return "Medium";
  return "Low";
}

function severityToBadge(severity: RadarSeverity): BadgeVariant {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "neutral";
}

function chartSeriesInRange(
  points: { date: string; value: number }[],
  range?: PerformanceDateRange,
): { date: string; value: number }[] {
  if (!range) return points;
  return points.filter((point) => point.date >= range.from && point.date <= range.to);
}

function findPerson(snapshot: PerformanceFetchResult["teamSnapshot"], id: string): Person | undefined {
  return snapshot.persons.find((person) => person.id === id);
}

function selfPerson(snapshot: PerformanceFetchResult["teamSnapshot"]): Person | undefined {
  return snapshot.persons[0];
}

export interface PerformanceViewModels {
  teamOverview: TeamPerformanceSnapshot;
  teamSecondary: TeamSecondarySnapshot;
  employee: EmployeePerformanceSnapshot | null;
  getPersonDetail: (personId: string) => PersonDetailSnapshot | null;
  getPersonAnalytics: (personId: string) => PersonAnalyticsWorkspace | null;
  getPerson: (personId: string) => Person | undefined;
  statusMessage: string | null;
}

export function buildPerformanceViewModels(
  data: PerformanceFetchResult,
  selfPersonId: string,
  dateRangeKey: DateRangeKey = "30d",
  displayRange?: PerformanceDateRange,
  reviewTarget: PerformanceReviewTarget = "team",
  operationalRules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): PerformanceViewModels {
  const trendDays = displayRange
    ? trendComparisonDayCount(displayRange)
    : dateRangeKey === "7d"
      ? 7
      : dateRangeKey === "30d"
        ? 30
        : 90;
  const trendContextLabel = displayRange
    ? comparisonPeriodLabel(displayRange)
    : undefined;
  const { teamSnapshot, historyTeamSnapshot, reportData, historyReportData, kpiSnapshots, partialWarnings, timeOffEntries } =
    data;
  const params = reportData.params;
  const historyParams = historyReportData.params;
  let radar = buildTeamRadar(teamSnapshot, params, undefined, operationalRules);
  radar = applyVisualGroupedTasksFixture(radar);
  const deliveryRisk = buildDeliveryRiskItems(
    teamSnapshot,
    params,
    undefined,
    operationalRules,
    data.dependencyIndex,
  );

  const teamKpi = reportData.teamKpi;
  const firstPassRate =
    teamKpi.completedCount > 0
      ? Math.round((teamKpi.firstPassAcceptedCount / teamKpi.completedCount) * 100)
      : 0;

  const completedTrend = compareTrendPeriods(
    teamTrendPoints(kpiSnapshots, "completedOnDate"),
    "completed",
    trendDays,
  );
  const firstPassTrend = compareWeightedFirstPassTrend(
    teamTrendPoints(kpiSnapshots, "completedOnDate"),
    teamTrendPoints(kpiSnapshots, "firstPassOnDate"),
    trendDays,
  );
  const avgCycleTrend = compareWeightedAvgCycleTrend(
    teamTrendPoints(kpiSnapshots, "cycleMsSumOnDate"),
    teamTrendPoints(kpiSnapshots, "completedWithCycleOnDate"),
    trendDays,
  );
  const backflowTrend = compareTrendPeriods(
    teamTrendPoints(kpiSnapshots, "backflowsOnDate"),
    "backflows",
    trendDays,
  );

  const summary: MetricCardData[] = [
    {
      label: "Efficiency",
      value: `${teamKpi.efficiencyIndex}%`,
      status: getEfficiencyStatus(teamKpi.efficiencyIndex),
      statusVariant: efficiencyStatusVariant(teamKpi.efficiencyIndex),
    },
    {
      label: "First pass",
      value: `${firstPassRate}%`,
      ...metricContextFromComparison(firstPassTrend, dateRangeKey, trendContextLabel),
    },
    {
      label: "Completed",
      value: String(teamKpi.completedCount),
      ...metricContextFromComparison(completedTrend, dateRangeKey, trendContextLabel),
    },
    {
      label: "Backflows",
      value: String(teamKpi.backflowCount),
      ...metricContextFromComparison(backflowTrend, dateRangeKey, trendContextLabel),
    },
  ];

  const attention: AttentionPerson[] = radar
    .slice(0, ATTENTION_OVERVIEW_LIMIT)
    .map((item) => mapAttentionPerson(item, teamSnapshot));
  const attentionTotalCount = radar.length;

  const sparkCompleted = sparklineValues(
    teamSparklinePoints(kpiSnapshots, "completedOnDate"),
  );
  const sparkFirstPass = sparklineValues(teamFirstPassRateSparklinePoints(kpiSnapshots));
  const sparkAvgCycle = sparklineValues(teamAvgCycleDaysSparklinePoints(kpiSnapshots));
  const sparkBackflows = sparklineValues(
    teamSparklinePoints(kpiSnapshots, "backflowsOnDate"),
  );

  const completedChartPoints = teamSparklinePoints(
    kpiSnapshots,
    "completedOnDate",
    Math.max(trendDays, 56),
  );
  const firstPassChartPoints = teamFirstPassRateSparklinePoints(
    kpiSnapshots,
    Math.max(trendDays, 56),
  );
  const avgCycleChartPoints = teamAvgCycleDaysSparklinePoints(
    kpiSnapshots,
    Math.max(trendDays, 56),
  );
  const backflowChartPoints = teamSparklinePoints(
    kpiSnapshots,
    "backflowsOnDate",
    Math.max(trendDays, 56),
  );

  const completedSufficiency = trendSufficiency(
    teamTrendPoints(kpiSnapshots, "completedOnDate"),
    trendDays,
  );

  const trends: TrendCardData[] = [
    buildTrendCardData("Completed", completedTrend, {
      sparkline: sparkCompleted,
      chartSeries: chartSeriesInRange(completedChartPoints, displayRange),
      trendMetricKind: "count",
      sufficiency: completedSufficiency,
    }),
    buildTrendCardData("First pass", firstPassTrend, {
      sparkline: sparkFirstPass,
      chartSeries: chartSeriesInRange(firstPassChartPoints, displayRange),
      trendMetricKind: "percent",
      sufficiency: completedSufficiency,
    }),
    buildTrendCardData("Avg cycle", avgCycleTrend, {
      sparkline: sparkAvgCycle,
      chartSeries: chartSeriesInRange(avgCycleChartPoints, displayRange),
      trendMetricKind: "duration",
      sufficiency: completedSufficiency,
    }),
    buildTrendCardData("Backflows", backflowTrend, {
      sparkline: sparkBackflows,
      chartSeries: chartSeriesInRange(backflowChartPoints, displayRange),
      trendMetricKind: "count",
      sufficiency: completedSufficiency,
    }),
  ];

  const workloadBalance = buildWorkloadBalance(teamSnapshot, personRouteKey, {
    active: (person) => personActiveCount(person, params),
    atRisk: (person) => personAtRiskCount(person, params),
    problematic: (person) => personProblematicCount(person, params),
  });

  const workload: WorkloadRow[] = workloadBalance.rows.map((row) => {
    const person = findPerson(teamSnapshot, row.personId);
    return {
      personId: row.personId,
      personName: row.personName,
      ...buildWorkloadRowFields(person, {
        activeWork: row.activeCount,
        atRisk: row.atRiskCount,
      }),
    };
  });

  const teamEmployeeIds = new Set(teamSnapshot.persons.map((person) => person.id));
  const plannedTimeOff = buildPlannedTimeOffRows(timeOffEntries, teamEmployeeIds);
  const timeOff: UiTimeOffEntry[] = plannedTimeOff.slice(0, 5).map((row) => {
    const person = findPerson(teamSnapshot, row.employeeId);
    return {
      personId: row.employeeId,
      personName: person?.bamboo.displayName || row.personName,
      rangeLabel: row.rangeLabel,
      note: row.typeLabel,
      startDate: row.start,
      endDate: row.end,
    };
  });

  const personDetails: Record<string, PersonPerformanceDetail> = {};
  for (const person of teamSnapshot.persons) {
    personDetails[person.id] = {
      personId: person.id,
      efficiency: person.performance
        ? `${person.performance.efficiencyIndex}%`
        : "—",
      firstPass: `${firstPassPercent(person)}%`,
      completed: person.performance
        ? String(person.performance.completedCount)
        : "0",
      workload: formatWorkloadLabel(person.workload?.level, {
        workload: person.workload,
        availability: person.availability,
      }),
      summary: avgCycleLabel(person),
    };
  }

  const directReportIds = teamSnapshot.persons
    .filter((person) => person.id !== selfPersonId)
    .map((person) => person.id);

  const teamOverview: TeamPerformanceSnapshot = {
    directReportIds,
    summary,
    attention,
    attentionTotalCount,
    trends,
    workload,
    timeOff,
    personDetails,
  };

  const people: TeamPeopleRow[] = teamSnapshot.persons.map((person) => {
    const radarItem = radar.find((item) => item.personId === person.id);
    const primary = radarItem?.signals[0];
    const attentionIssueKey = primary?.issueKey;
    const attentionReason = primary
      ? attentionReasonFromSignal(primary.label)
      : "No attention signals";
    const attentionSeverityLabel = radarItem
      ? radarSeverityLabel(radarItem.severity)
      : "Stable";
    const attentionState = primary
      ? `${primary.issueKey ? `${primary.issueKey} — ` : ""}${attentionReasonFromSignal(primary.label)}`
      : "Stable";
    return {
      personId: person.id,
      personName: person.bamboo.displayName,
      role: person.bamboo.jobTitle || "—",
      efficiency: person.performance
        ? `${person.performance.efficiencyIndex}%`
        : "—",
      workload: formatWorkloadLabel(person.workload?.level, {
        workload: person.workload,
        availability: person.availability,
      }),
      availability: person.availability.label,
      attentionState,
      attentionSeverityLabel,
      attentionIssueKey,
      attentionIssueKeys:
        radarItem && radarItem.relatedIssueKeys.length > 0
          ? radarItem.relatedIssueKeys
          : attentionIssueKey
            ? [attentionIssueKey]
            : [],
      attentionReason: radarItem ? attentionReason : "—",
      attentionVariant: radarItem
        ? severityToBadge(radarItem.severity)
        : "success",
    };
  });

  const radarRows: TeamRadarRow[] = radar.map((item) => {
    const primary = item.signals[0];
    const primaryAction = item.primaryAction;
    const actionLabel =
      primaryAction === "review_workload" || primaryAction === "review_tasks"
        ? "Review workload"
        : "View person";
    return {
      personId: item.personId,
      personName: item.personName,
      severity:
        item.severity === "critical"
          ? "High"
          : item.severity === "warning"
            ? "Medium"
            : "Low",
      severityVariant: severityToBadge(item.severity),
      reason: primary?.label || "—",
      reasonDetail: primary ? attentionReasonFromSignal(primary.label) : "—",
      primaryIssueKey: primary?.issueKey,
      relatedIssueKeys: item.relatedIssueKeys,
      primaryAction,
      tasksAffected: item.relatedIssueKeys.length,
      action: actionLabel,
    };
  });

  const deliveryRows: DeliveryRiskRow[] = deliveryRisk.map((item) => ({
    issueKey: item.issueKey,
    issueTitle: item.summary,
    ownerId: item.personId,
    ownerName: item.personName,
    age: item.stageLabel,
    status: item.status,
    riskReason: item.reason,
  }));

  const teamSecondary: TeamSecondarySnapshot = {
    people,
    radar: radarRows,
    deliveryRisk: deliveryRows,
  };

  const employeePerson =
    findPerson(teamSnapshot, selfPersonId) || selfPerson(teamSnapshot);
  const historyEmployeePerson =
    findPerson(historyTeamSnapshot, selfPersonId) || employeePerson;
  const employee = employeePerson
    ? (() => {
        const workspace = buildPersonAnalyticsWorkspace({
          person: employeePerson,
          historyPerson: historyEmployeePerson || employeePerson,
          params,
          historyParams,
          kpiSnapshots,
          trendDays,
          dateRangeKey,
          displayRange,
          reviewTarget,
          timeOffEntries,
          teamEmployeeIds,
          operationalRules,
        });
        const myWeek = buildMyWeek(
          historyEmployeePerson || employeePerson,
          historyParams,
          undefined,
          operationalRules,
        );
        return buildEmployeeSnapshot(
          workspace,
          myWeek,
          params,
          historyParams,
          operationalRules,
        );
      })()
    : null;

  const getPersonDetail = (personId: string): PersonDetailSnapshot | null => {
    const person = findPerson(teamSnapshot, personId);
    if (!person) return null;
    const historyPerson =
      findPerson(historyTeamSnapshot, personId) || person;
    return buildPersonDetailSnapshot(
      person,
      historyPerson,
      params,
      historyParams,
      operationalRules,
    );
  };

  const getPersonAnalytics = (personId: string): PersonAnalyticsWorkspace | null => {
    const person = findPerson(teamSnapshot, personId);
    if (!person) return null;
    const historyPerson = findPerson(historyTeamSnapshot, personId) || person;
    return buildPersonAnalyticsWorkspace({
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
      operationalRules,
    });
  };

  let statusMessage: string | null = null;
  if (partialWarnings.includes("no_jira_issues_in_period")) {
    statusMessage = "No Jira work found for this period.";
  } else if (partialWarnings.some((w) => w.startsWith("unresolved_jira_identity"))) {
    statusMessage = "Some employee identities could not be matched to Jira.";
  }

  return {
    teamOverview,
    teamSecondary,
    employee,
    getPersonDetail,
    getPersonAnalytics,
    getPerson: (personId) => findPerson(teamSnapshot, personId),
    statusMessage,
  };
}

function issueToActiveWork(issue: AuditIssue): ActiveWorkItem {
  return {
    key: issue.issueKey,
    title: issue.issueSummary,
    status: issue.currentStatus || "—",
  };
}

function employeeWorkRowView(
  issue: import("../../domain/jira/types").AuditIssue,
  params: AuditReportData["params"],
  now: Date,
): EmployeeWorkRowView {
  const row = auditIssueToPersonWorkRow(issue, params, now);
  return {
    key: row.key,
    title: row.title,
    status: row.status,
    stageAge: row.stageAge,
    healthVariant: row.healthVariant,
  };
}

function employeeCompletedRowView(
  issue: import("../../domain/jira/types").AuditIssue,
  params: AuditReportData["params"],
): EmployeeCompletedRowView {
  const fullIssue = withFullIssueHistory(issue);
  const health = classifyTaskHealth({ issue: fullIssue, params });
  const completedAt = getIssueCompletionAt(fullIssue);
  const cycleMs = getIssueFullCycleMs(fullIssue);
  return {
    key: issue.issueKey,
    title: issue.issueSummary,
    completedOn: completedAt
      ? format(parseISO(completedAt), "d MMM")
      : undefined,
    cycle: cycleMs != null ? formatDuration(cycleMs) : undefined,
    outcome: health.isFirstPass
      ? "First pass"
      : health.isCompleted
        ? "Rework"
        : undefined,
  };
}

function buildEmployeeSnapshot(
  workspace: PersonAnalyticsWorkspace,
  myWeek: ReturnType<typeof buildMyWeek>,
  _params: AuditReportData["params"],
  historyParams: AuditReportData["params"],
  operationalRules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): EmployeePerformanceSnapshot {
  const now = new Date();
  const metrics = workspace.performanceKpis;

  const activeWork: ActiveWorkItem[] = workspace.workRows.slice(0, 12).map((row) => ({
    key: row.key,
    title: row.title,
    status: row.status,
  }));

  const myWeekAttention = myWeek.needsAttention.map((task) => {
    const signal = classifyIssueAttention(
      task.issue,
      historyParams,
      now,
      operationalRules,
    );
    return {
      label: signal
        ? formatAttentionHealthLabel(signal.health.status)
        : "Needs attention",
      variant: signal ? severityToBadge(signal.severity) : ("warning" as BadgeVariant),
      reason: task.reason,
      issueKey: task.issueKey,
    };
  });

  const myWeekView: EmployeeMyWeekSnapshot = {
    summary: [
      { label: "Active", value: String(myWeek.summary.currentlyActive) },
      { label: "In review", value: String(myWeek.inReview.length) },
      { label: "Completed", value: String(myWeek.summary.completedThisWeek) },
      {
        label: "Needs attention",
        value: String(myWeek.needsAttention.length),
      },
    ],
    needsAttention: myWeekAttention,
    inProgress: myWeek.inProgress.map((issue) =>
      employeeWorkRowView(issue, historyParams, now),
    ),
    inReview: myWeek.inReview.map((issue) =>
      employeeWorkRowView(issue, historyParams, now),
    ),
    completedThisWeek: myWeek.completedThisWeek.map((issue) =>
      employeeCompletedRowView(issue, historyParams),
    ),
  };

  return {
    personId: workspace.personId,
    metrics,
    cycleTime: workspace.cycleTime,
    activeWork,
    attention: workspace.attention,
    timeOff: workspace.timeOff,
    trends: workspace.trends,
    myWeek: myWeekView,
    historyWeek: workspace.historyWeek,
    historyMonth: workspace.historyMonth,
    historyQuarter: workspace.historyQuarter,
  };
}

function buildPersonDetailSnapshot(
  person: Person,
  historyPerson: Person,
  params: AuditReportData["params"],
  historyParams: AuditReportData["params"],
  operationalRules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): PersonDetailSnapshot {
  const perf = person.performance;
  const activeIssues = getActiveIssues(person, params);
  const now = new Date();
  const problematicWork = getOperationalIssues(person)
    .filter(
      (issue) =>
        classifyTaskHealth({ issue, params, now }).status === "problematic",
    )
    .slice(0, 8)
    .map(issueToActiveWork);

  return {
    personId: person.id,
    personName: person.bamboo.displayName,
    availability: person.availability.label,
    workload: formatWorkloadLabel(person.workload?.level, {
      workload: person.workload,
      availability: person.availability,
    }),
    efficiency: perf ? `${perf.efficiencyIndex}%` : "—",
    firstPass: `${firstPassPercent(person)}%`,
    completed: perf ? String(perf.completedCount) : "0",
    backflows: perf ? String(perf.backflowCount) : "0",
    attention: activeIssues
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
      .filter((item): item is NonNullable<typeof item> => item != null)
      .slice(0, 24),
    activeWork: activeIssues.slice(0, 10).map(issueToActiveWork),
    problematicWork,
    history: buildWorkHistory(historyPerson, historyParams, "month")
      .flatMap((group) => group.entries)
      .slice(0, 15)
      .map((entry) => ({
        key: entry.issueKey,
        title: entry.summary,
        project: entry.project,
        completedOn: entry.completedAt
          ? format(parseISO(entry.completedAt), "dd MMM yyyy")
          : "—",
        cycle: entry.cycleMs != null ? formatDuration(entry.cycleMs) : "—",
        outcome: entry.firstPass ? "First pass" : "Rework",
      })),
  };
}

import { format, parseISO } from "date-fns";
import type { BadgeVariant } from "../../components/Badge/Badge";
import { getEfficiencyStatus } from "../../domain/jira/kpi";
import { formatDuration } from "../../domain/jira/dates";
import type { AuditReportData } from "../../domain/jira/types";
import type { Person } from "../../domain/people/types";
import {
  avgCycleLabel,
  firstPassPercent,
  formatWorkloadLabel,
  personActiveCount,
  personAtRiskCount,
  personProblematicCount,
} from "../../domain/people/personDisplay";
import { buildMyWeek } from "../../domain/personal/myWeek";
import { buildWorkHistory } from "../../domain/personal/workHistory";
import type {
  ActiveWorkItem,
  AttentionPerson,
  DeliveryRiskRow,
  EmployeePerformanceSnapshot,
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
import { buildDeliveryRiskItems } from "../../domain/radar/deliveryRisk";
import { buildTeamRadar } from "../../domain/radar/teamRadar";
import type { RadarSeverity } from "../../domain/radar/types";
import {
  compareTrendPeriods,
  compareWeightedAvgCycleTrend,
  compareWeightedFirstPassTrend,
} from "../../domain/trends/trendEngine";
import {
  teamSparklinePoints,
  teamTrendPoints,
  personSparklinePoints,
} from "../../domain/snapshots/snapshotEngine";
import type { KpiSnapshotFile } from "../../domain/snapshots/types";
import { buildWorkloadBalance } from "../../domain/workload/workloadBalance";
import { personRouteKey } from "../../domain/people/personDisplay";
import type { PerformanceFetchResult } from "./performanceDataService";
import { getActiveIssues, classifyIssueAttention } from "../../domain/radar/taskSignals";
function efficiencyStatusVariant(score: number): BadgeVariant {
  const status = getEfficiencyStatus(score);
  if (status === "Excellent" || status === "Healthy") return "success";
  if (status === "Watch") return "warning";
  return "danger";
}

function sparklineValues(points: { value: number }[]): number[] {
  return points.map((point) => point.value);
}

function severityToBadge(severity: RadarSeverity): BadgeVariant {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "neutral";
}

function mapWorkloadUi(level: string | undefined): WorkloadRow["workload"] {
  if (level === "low") return "Light";
  if (level === "high" || level === "overloaded") return "Heavy";
  return "Balanced";
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
  getPerson: (personId: string) => Person | undefined;
  statusMessage: string | null;
}

export function buildPerformanceViewModels(
  data: PerformanceFetchResult,
  selfPersonId: string,
): PerformanceViewModels {
  const { teamSnapshot, reportData, kpiSnapshots, partialWarnings } = data;
  const params = reportData.params;
  const radar = buildTeamRadar(teamSnapshot, params);
  const deliveryRisk = buildDeliveryRiskItems(teamSnapshot, params);

  const teamKpi = reportData.teamKpi;
  const firstPassRate =
    teamKpi.completedCount > 0
      ? Math.round((teamKpi.firstPassAcceptedCount / teamKpi.completedCount) * 100)
      : 0;

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
    },
    {
      label: "Completed",
      value: String(teamKpi.completedCount),
    },
    {
      label: "Backflows",
      value: String(teamKpi.backflowCount),
    },
  ];

  const attention: AttentionPerson[] = radar.slice(0, 8).map((item) => {
    const person = findPerson(teamSnapshot, item.personId);
    return {
      personId: item.personId,
      personName: item.personName,
      personRole: person?.bamboo.jobTitle || undefined,
      reason: item.signals[0]?.label || "Needs review",
      indicators: item.signals.slice(0, 2).map((signal) => ({
        label: signal.label.split(" — ")[0]?.slice(0, 32) || signal.label,
        variant: severityToBadge(signal.severity),
      })),
    };
  });

  const completedTrend = compareTrendPeriods(
    teamTrendPoints(kpiSnapshots, "completedOnDate"),
    "completed",
    28,
  );
  const firstPassTrend = compareWeightedFirstPassTrend(
    teamTrendPoints(kpiSnapshots, "completedOnDate"),
    teamTrendPoints(kpiSnapshots, "firstPassOnDate"),
    28,
  );
  const avgCycleTrend = compareWeightedAvgCycleTrend(
    teamTrendPoints(kpiSnapshots, "cycleMsSumOnDate"),
    teamTrendPoints(kpiSnapshots, "completedWithCycleOnDate"),
    28,
  );
  const backflowTrend = compareTrendPeriods(
    teamTrendPoints(kpiSnapshots, "backflowsOnDate"),
    "backflows",
    28,
  );

  const sparkCompleted = sparklineValues(
    teamSparklinePoints(kpiSnapshots, "completedOnDate"),
  );

  const trends: TrendCardData[] = [
    {
      label: "Completed",
      value: completedTrend.sufficient
        ? completedTrend.label
        : completedTrend.sufficiencyMessage || "Not enough history yet",
      sparkline:
        completedTrend.sufficient && sparkCompleted.length >= 2
          ? sparkCompleted
          : undefined,
    },
    {
      label: "First pass",
      value: firstPassTrend.sufficient
        ? firstPassTrend.label
        : firstPassTrend.sufficiencyMessage || "Not enough history yet",
    },
    {
      label: "Avg cycle",
      value: avgCycleTrend.sufficient
        ? avgCycleTrend.label
        : avgCycleTrend.sufficiencyMessage || "Not enough history yet",
    },
    {
      label: "Backflows",
      value: backflowTrend.sufficient
        ? backflowTrend.label
        : backflowTrend.sufficiencyMessage || "Not enough history yet",
    },
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
      activeWork: row.activeCount,
      atRisk: row.atRiskCount,
      workload: mapWorkloadUi(person?.workload?.level),
      availability: person?.availability.label || "—",
    };
  });

  const timeOff: UiTimeOffEntry[] = teamSnapshot.persons
    .filter(
      (person) =>
        person.availability.state === "on_vacation" ||
        person.availability.state === "vacation_soon" ||
        person.availability.state === "vacation_tomorrow",
    )
    .map((person) => ({
      personId: person.id,
      personName: person.bamboo.displayName,
      rangeLabel: person.availability.label,
      note: person.availability.returnDate
        ? `Returns ${person.availability.returnDate}`
        : person.bamboo.jobTitle || "",
    }));

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
      workload: formatWorkloadLabel(person.workload?.level),
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
    trends,
    workload,
    timeOff,
    personDetails,
  };

  const people: TeamPeopleRow[] = teamSnapshot.persons.map((person) => {
    const radarItem = radar.find((item) => item.personId === person.id);
    const attentionState = radarItem
      ? radarItem.signals[0]?.label || "Needs attention"
      : "Stable";
    return {
      personId: person.id,
      personName: person.bamboo.displayName,
      role: person.bamboo.jobTitle || "—",
      efficiency: person.performance
        ? `${person.performance.efficiencyIndex}%`
        : "—",
      workload: formatWorkloadLabel(person.workload?.level),
      availability: person.availability.label,
      attentionState,
      attentionVariant: radarItem
        ? severityToBadge(radarItem.severity)
        : "success",
    };
  });

  const radarRows: TeamRadarRow[] = radar.map((item) => ({
    personId: item.personId,
    personName: item.personName,
    severity:
      item.severity === "critical"
        ? "High"
        : item.severity === "warning"
          ? "Medium"
          : "Low",
    severityVariant: severityToBadge(item.severity),
    reason: item.signals[0]?.label || "—",
    tasksAffected: item.relatedIssueKeys.length,
    action: item.primaryAction === "review_workload" ? "Review workload" : "View person",
  }));

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
  const employee = employeePerson
    ? buildEmployeeSnapshot(employeePerson, params, kpiSnapshots)
    : null;

  const getPersonDetail = (personId: string): PersonDetailSnapshot | null => {
    const person = findPerson(teamSnapshot, personId);
    if (!person) return null;
    return buildPersonDetailSnapshot(person, params);
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
    getPerson: (personId) => findPerson(teamSnapshot, personId),
    statusMessage,
  };
}

function buildEmployeeSnapshot(
  person: Person,
  params: AuditReportData["params"],
  kpiSnapshots: KpiSnapshotFile,
): EmployeePerformanceSnapshot {
  const myWeek = buildMyWeek(person, params);
  const perf = person.performance;

  const metrics: MetricCardData[] = [
    {
      label: "Efficiency",
      value: perf ? `${perf.efficiencyIndex}%` : "—",
      status: perf ? getEfficiencyStatus(perf.efficiencyIndex) : undefined,
    },
    {
      label: "First pass",
      value: `${firstPassPercent(person)}%`,
    },
    {
      label: "Completed",
      value: perf ? String(perf.completedCount) : "0",
    },
    {
      label: "Active",
      value: String(personActiveCount(person, params)),
    },
  ];

  const activeWork: ActiveWorkItem[] = getActiveIssues(person, params)
    .slice(0, 12)
    .map((issue) => ({
      key: issue.issueKey,
      title: issue.issueSummary,
      status: issue.currentStatus || "—",
    }));

  const attention = myWeek.needsAttention.map((task) => ({
    label: task.issueKey,
    variant: "warning" as BadgeVariant,
    reason: task.reason,
  }));

  const timeOff =
    person.availability.state !== "available"
      ? {
          rangeLabel: person.availability.label,
          note: person.availability.returnDate
            ? `Returns ${person.availability.returnDate}`
            : "",
        }
      : undefined;

  const sparkValues = sparklineValues(
    personSparklinePoints(kpiSnapshots, person.id, "completedOnDate"),
  );
  const trends: TrendCardData[] = [
    {
      label: "Completed",
      value:
        sparkValues.length >= 2
          ? String(perf?.completedCount ?? 0)
          : "Not enough history yet",
      sparkline: sparkValues.length >= 2 ? sparkValues : undefined,
    },
  ];

  const historyGroups = buildWorkHistory(person, params, "week");
  const history = historyGroups.flatMap((group) =>
    group.entries.slice(0, 20).map((entry) => ({
      key: entry.issueKey,
      title: entry.summary,
      completedOn: entry.completedAt
        ? format(parseISO(entry.completedAt), "dd MMM yyyy")
        : "—",
      cycle: entry.cycleMs != null ? formatDuration(entry.cycleMs) : "—",
      outcome: entry.firstPass ? "First pass" : "Rework",
    })),
  );

  return {
    personId: person.id,
    metrics,
    activeWork,
    attention,
    timeOff,
    trends,
    history,
  };
}

function buildPersonDetailSnapshot(
  person: Person,
  params: AuditReportData["params"],
): PersonDetailSnapshot {
  const perf = person.performance;
  const activeIssues = getActiveIssues(person, params);
  const now = new Date();

  return {
    personId: person.id,
    personName: person.bamboo.displayName,
    availability: person.availability.label,
    workload: formatWorkloadLabel(person.workload?.level),
    efficiency: perf ? `${perf.efficiencyIndex}%` : "—",
    firstPass: `${firstPassPercent(person)}%`,
    completed: perf ? String(perf.completedCount) : "0",
    backflows: perf ? String(perf.backflowCount) : "0",
    attention: activeIssues
      .map((issue) => classifyIssueAttention(issue, params, now))
      .filter(Boolean)
      .slice(0, 5)
      .map((item) => ({
        label: item!.health.status.replace(/_/g, " "),
        variant: severityToBadge(item!.severity),
        reason: item!.reason,
      })),
    activeWork: activeIssues.slice(0, 10).map((issue) => ({
      key: issue.issueKey,
      title: issue.issueSummary,
      status: issue.currentStatus || "—",
    })),
    history: buildWorkHistory(person, params, "month")
      .flatMap((group) => group.entries)
      .slice(0, 15)
      .map((entry) => ({
        key: entry.issueKey,
        title: entry.summary,
        completedOn: entry.completedAt
          ? format(parseISO(entry.completedAt), "dd MMM yyyy")
          : "—",
        cycle: entry.cycleMs != null ? formatDuration(entry.cycleMs) : "—",
        outcome: entry.firstPass ? "First pass" : "Rework",
      })),
  };
}

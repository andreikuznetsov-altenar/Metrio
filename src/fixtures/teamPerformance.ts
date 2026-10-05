import type {
  AttentionPerson,
  DateRangeKey,
  DeliveryRiskRow,
  PersonPerformanceDetail,
  ReviewTargetKey,
  TeamPerformanceSnapshot,
  TeamPeopleRow,
  TeamRadarRow,
  TeamSecondarySnapshot,
  TrendCardData,
  WorkloadRow,
} from "../domain/performance";
import type { RadarSeverity } from "../domain/radar/types";
import { roleLabel } from "../domain/types";
import { getPerson } from "./people";

function hash(id: string): number {
  return id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function pickAttention(directReportIds: string[]): AttentionPerson[] {
  const items: AttentionPerson[] = [];
  const reasons = [
    "Cycle time trending above team target",
    "First-pass rate dropped this week",
    "Active load exceeds planned capacity",
    "Upcoming time off with open commitments",
  ];

  directReportIds.forEach((personId, index) => {
    const score = hash(personId) % 5;
    if (score > 2) {
      return;
    }

    const severity: RadarSeverity = score === 0 ? "critical" : "warning";
    const issueKeys = score === 0 ? ["UX-2962", "UX-5203"] : ["UX-1201"];

    items.push({
      personId,
      reason: reasons[index % reasons.length],
      severity,
      issueKeys,
      issueCount: issueKeys.length,
    });
  });

  return items;
}

function buildPersonDetail(personId: string): PersonPerformanceDetail {
  const seed = hash(personId);
  return {
    personId,
    efficiency: `${78 + (seed % 15)}%`,
    firstPass: `${70 + (seed % 20)}%`,
    completed: `${12 + (seed % 8)}`,
    workload: ["Light", "Balanced", "Heavy"][seed % 3],
    summary:
      "Direct-report snapshot only. Deeper delivery history will arrive in a later phase.",
  };
}

function buildWorkloadRows(directReportIds: string[]): WorkloadRow[] {
  return directReportIds.map((personId) => {
    const seed = hash(personId);
    const workload = (["Light", "Balanced", "Heavy"] as const)[seed % 3];
    return {
      personId,
      activeWork: 3 + (seed % 6),
      atRisk: seed % 4 === 0 ? 2 : seed % 3,
      workload,
      availability:
        seed % 5 === 0 ? "Limited this week" : "Available",
    };
  });
}

function buildTrends(
  directReportIds: string[],
  dateRange: DateRangeKey,
): TrendCardData[] {
  const base = directReportIds.length * 3 + (dateRange === "7d" ? 2 : 5);
  return [
    {
      label: "Completed",
      value: `${base + 18}`,
      sparkline: [8, 10, 9, 12, 11, 14, 13],
    },
    {
      label: "First pass",
      value: `${72 + (base % 10)}%`,
      sparkline: [62, 65, 68, 66, 70, 71, 74],
    },
    {
      label: "Avg cycle",
      value: `${3 + (base % 4)}.2d`,
    },
    {
      label: "Backflows",
      value: `${2 + (base % 3)}`,
      sparkline: [4, 3, 4, 2, 3, 2, 1],
    },
  ];
}

export function getTeamPerformanceSnapshot(
  directReportIds: string[],
  dateRange: DateRangeKey,
  reviewTarget: ReviewTargetKey,
  refreshToken: number,
): TeamPerformanceSnapshot {
  const modifier = refreshToken % 3;
  const targetBias = reviewTarget === "sprint" ? 2 : reviewTarget === "org" ? -1 : 0;
  const rangeBias = dateRange === "7d" ? -2 : dateRange === "3m" ? 3 : 0;
  const efficiency = 84 + modifier + targetBias;
  const firstPass = 76 + modifier;
  const completed = directReportIds.length * 4 + rangeBias + modifier;
  const backflows = 2 + (modifier % 2);

  const personDetails = Object.fromEntries(
    directReportIds.map((id) => [id, buildPersonDetail(id)]),
  );

  return {
    directReportIds: [...directReportIds],
    summary: [
      {
        label: "Efficiency",
        value: `${efficiency}%`,
        status: targetBias >= 0 ? "On target" : "Below target",
        statusVariant: targetBias >= 0 ? "success" : "warning",
        tooltip: "Throughput relative to planned capacity for direct reports.",
      },
      {
        label: "First pass",
        value: `${firstPass}%`,
        status: "+3% vs prior",
        statusVariant: "accent",
        tooltip: "Share of work items completed without rework.",
      },
      {
        label: "Completed",
        value: `${completed}`,
        status: `Last ${dateRange === "7d" ? "7" : dateRange === "30d" ? "30" : "90"} days`,
        tooltip: "Items completed by your direct reports in the selected range.",
      },
      {
        label: "Backflows",
        value: `${backflows}`,
        status: backflows > 2 ? "Elevated" : "Stable",
        statusVariant: backflows > 2 ? "warning" : "neutral",
        tooltip: "Items returned for rework during the selected range.",
      },
    ],
    attention: pickAttention(directReportIds),
    attentionTotalCount: pickAttention(directReportIds).length,
    trends: buildTrends(directReportIds, dateRange),
    workload: buildWorkloadRows(directReportIds),
    timeOff: directReportIds
      .filter((id) => hash(id) % 4 === 0)
      .slice(0, 3)
      .map((personId, index) => ({
        personId,
        rangeLabel: index % 2 === 0 ? "Mon–Wed next week" : "Fri this week",
        note: "Partial availability",
      })),
    personDetails,
  };
}

function buildPeopleRows(
  directReportIds: string[],
  workload: WorkloadRow[],
  attention: AttentionPerson[],
): TeamPeopleRow[] {
  const attentionByPerson = new Map(
    attention.map((item) => [item.personId, item]),
  );

  return directReportIds.map((personId) => {
    const person = getPerson(personId);
    const detail = buildPersonDetail(personId);
    const load = workload.find((row) => row.personId === personId);
    const attentionItem = attentionByPerson.get(personId);

    return {
      personId,
      personName: person.name,
      role: roleLabel(person.role),
      efficiency: detail.efficiency,
      workload: load?.workload ?? detail.workload,
      availability: load?.availability ?? "Available",
      attentionState: attentionItem
        ? attentionItem.severity === "critical"
          ? "High"
          : "Watch"
        : "Clear",
      attentionSeverityLabel: attentionItem
        ? attentionItem.severity === "critical"
          ? "High"
          : "Medium"
        : "Stable",
      attentionIssueKey: attentionItem?.issueKeys[0],
      attentionReason: attentionItem?.reason ?? "—",
      attentionVariant: attentionItem
        ? attentionItem.severity === "critical"
          ? "danger"
          : "warning"
        : "success",
    };
  });
}

function buildRadarRows(
  directReportIds: string[],
  attention: AttentionPerson[],
): TeamRadarRow[] {
  const rows: TeamRadarRow[] = [];

  attention.forEach((item, index) => {
    const seed = hash(item.personId);
    const severity =
      item.severity === "critical"
        ? "High"
        : item.severity === "warning"
          ? "Medium"
          : "Low";
    const severityVariant =
      severity === "High"
        ? "danger"
        : severity === "Medium"
          ? "warning"
          : "neutral";

    const issueKey = item.issueKeys[0];
    const primaryAction = index % 2 === 0 ? "review_workload" : "view_person";
    rows.push({
      personId: item.personId,
      personName: getPerson(item.personId).name,
      severity,
      severityVariant,
      reason: issueKey ? `${issueKey} — ${item.reason}` : item.reason,
      reasonDetail: item.reason,
      primaryIssueKey: issueKey,
      primaryAction,
      tasksAffected: 1 + (seed % 4),
      action: primaryAction === "review_workload" ? "Review workload" : "View person",
    });
  });

  if (rows.length === 0) {
    return directReportIds.slice(0, 1).map((personId) => ({
      personId,
      personName: getPerson(personId).name,
      severity: "Low" as const,
      severityVariant: "neutral",
      reason: "Monitoring baseline signals",
      reasonDetail: "Monitoring baseline signals",
      primaryAction: "view_person" as const,
      tasksAffected: 1,
      action: "View person",
    }));
  }

  return rows.sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

function buildDeliveryRiskRows(directReportIds: string[]): DeliveryRiskRow[] {
  const issues = [
    {
      key: "MET-204",
      title: "Payment gateway timeout handling",
      risk: "Blocked dependency",
      status: "Blocked",
    },
    {
      key: "MET-198",
      title: "Legacy auth migration checklist",
      risk: "Stale review",
      status: "In review",
    },
    {
      key: "MET-191",
      title: "Release candidate regression suite",
      risk: "Aging in progress",
      status: "In progress",
    },
    {
      key: "MET-185",
      title: "Customer export timeout",
      risk: "Repeated backflow",
      status: "Rework",
    },
  ];

  return issues.slice(0, Math.min(issues.length, directReportIds.length + 1)).map(
    (issue, index) => {
      const ownerId = directReportIds[index % directReportIds.length];
      return {
        issueKey: issue.key,
        issueTitle: issue.title,
        ownerId,
        ownerName: getPerson(ownerId).name,
        age: `${3 + index}d`,
        status: issue.status,
        riskReason: issue.risk,
      };
    },
  );
}

export function getTeamSecondarySnapshot(
  directReportIds: string[],
  dateRange: DateRangeKey,
  reviewTarget: ReviewTargetKey,
  refreshToken: number,
): TeamSecondarySnapshot {
  const snapshot = getTeamPerformanceSnapshot(
    directReportIds,
    dateRange,
    reviewTarget,
    refreshToken,
  );

  return {
    people: buildPeopleRows(
      directReportIds,
      snapshot.workload,
      snapshot.attention,
    ),
    radar: buildRadarRows(directReportIds, snapshot.attention),
    deliveryRisk: buildDeliveryRiskRows(directReportIds),
  };
}

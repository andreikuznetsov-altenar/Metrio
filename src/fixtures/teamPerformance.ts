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

function hash(id: string): number {
  return id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function pickAttention(directReportIds: string[]): AttentionPerson[] {
  const items: AttentionPerson[] = [];

  directReportIds.forEach((personId, index) => {
    const score = hash(personId) % 5;
    if (score > 2) {
      return;
    }

    const indicators: AttentionPerson["indicators"] =
      score === 0
        ? [
            { label: "At risk", variant: "danger" },
            { label: "Backflow", variant: "warning" },
          ]
        : [{ label: "Watch", variant: "warning" }];

    const reasons = [
      "Cycle time trending above team target",
      "First-pass rate dropped this week",
      "Active load exceeds planned capacity",
      "Upcoming time off with open commitments",
    ];

    items.push({
      personId,
      indicators,
      reason: reasons[index % reasons.length],
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
  const rangeBias = dateRange === "7d" ? -2 : dateRange === "quarter" ? 3 : 0;
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
    const detail = buildPersonDetail(personId);
    const load = workload.find((row) => row.personId === personId);
    const attentionItem = attentionByPerson.get(personId);

    return {
      personId,
      efficiency: detail.efficiency,
      workload: load?.workload ?? detail.workload,
      availability: load?.availability ?? "Available",
      attentionState: attentionItem ? attentionItem.indicators[0].label : "Clear",
      attentionVariant: attentionItem
        ? attentionItem.indicators[0].variant
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
      item.indicators.some((i) => i.variant === "danger")
        ? "High"
        : item.indicators.some((i) => i.variant === "warning")
          ? "Medium"
          : "Low";
    const severityVariant =
      severity === "High"
        ? "danger"
        : severity === "Medium"
          ? "warning"
          : "neutral";

    rows.push({
      personId: item.personId,
      severity,
      severityVariant,
      reason: item.reason,
      tasksAffected: 1 + (seed % 4),
      action: index % 2 === 0 ? "Review workload" : "Schedule check-in",
    });
  });

  if (rows.length === 0) {
    return directReportIds.slice(0, 1).map((personId) => ({
      personId,
      severity: "Low",
      severityVariant: "neutral",
      reason: "Monitoring baseline signals",
      tasksAffected: 1,
      action: "No action needed",
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

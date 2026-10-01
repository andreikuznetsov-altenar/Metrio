import type {
  DateRangeKey,
  EmployeePerformanceSnapshot,
  EmployeeReviewTargetKey,
  MetricCardData,
} from "../domain/performance";

function hash(value: string): number {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function getEmployeePerformanceSnapshot(
  personId: string,
  dateRange: DateRangeKey,
  reviewTarget: EmployeeReviewTargetKey,
  refreshToken: number,
): EmployeePerformanceSnapshot {
  const seed = hash(personId) + refreshToken;
  const rangeBias = dateRange === "7d" ? -1 : dateRange === "quarter" ? 2 : 0;
  const targetBias =
    reviewTarget === "personal" ? 1 : reviewTarget === "quarter" ? -1 : 0;

  const metrics: MetricCardData[] = [
    {
      label: "Efficiency",
      value: `${82 + (seed % 10) + targetBias}%`,
      status: "Personal pace",
      statusVariant: "accent",
      tooltip: "Your throughput relative to your planned capacity.",
    },
    {
      label: "First pass",
      value: `${74 + (seed % 12)}%`,
      status: "+2% vs prior",
      statusVariant: "success",
      tooltip: "Share of your work completed without rework.",
    },
    {
      label: "Completed",
      value: `${9 + rangeBias + (seed % 4)}`,
      status: `Last ${dateRange === "7d" ? "7" : dateRange === "30d" ? "30" : "90"} days`,
      tooltip: "Items you completed in the selected range.",
    },
    {
      label: "Backflows",
      value: `${1 + (seed % 2)}`,
      status: "Stable",
      statusVariant: "neutral",
      tooltip: "Items returned to you for rework.",
    },
  ];

  return {
    personId,
    metrics,
    activeWork: [
      {
        key: "MET-142",
        title: "Improve onboarding checklist flow",
        status: "In progress",
      },
      {
        key: "MET-139",
        title: "Resolve flaky integration test",
        status: "In review",
      },
      {
        key: "MET-131",
        title: "Update API error messaging",
        status: "In progress",
      },
    ],
    attention:
      seed % 3 === 0
        ? [
            {
              label: "Due soon",
              variant: "warning",
              reason: "MET-139 review deadline is tomorrow",
            },
          ]
        : [],
    timeOff:
      seed % 4 === 0
        ? { rangeLabel: "Thu–Fri this week", note: "Partial availability" }
        : undefined,
    trends: [
      {
        label: "Completed",
        value: `${8 + rangeBias + (seed % 3)}`,
        sparkline: [3, 4, 4, 5, 5, 6, 7],
      },
      {
        label: "First pass",
        value: `${72 + (seed % 8)}%`,
        sparkline: [64, 66, 67, 69, 70, 71, 73],
      },
      {
        label: "Avg cycle",
        value: `${2 + (seed % 3)}.4d`,
      },
      {
        label: "Backflows",
        value: `${1 + (seed % 2)}`,
        sparkline: [2, 2, 1, 2, 1, 1, 1],
      },
    ],
    history: [
      {
        key: "MET-120",
        title: "Add validation to settings form",
        completedOn: "Sep 24",
        cycle: "2.0d",
        outcome: "First pass",
      },
      {
        key: "MET-117",
        title: "Fix pagination on activity feed",
        completedOn: "Sep 18",
        cycle: "3.1d",
        outcome: "Reworked once",
      },
      {
        key: "MET-112",
        title: "Document release checklist",
        completedOn: "Sep 11",
        cycle: "1.6d",
        outcome: "First pass",
      },
      {
        key: "MET-108",
        title: "Tune query for dashboard cards",
        completedOn: "Sep 4",
        cycle: "2.8d",
        outcome: "First pass",
      },
    ],
  };
}

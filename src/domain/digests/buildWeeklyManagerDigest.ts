import type { TeamSnapshot } from "../people/types";
import type { AuditReportData } from "../jira/types";
import type { TeamRadarItem } from "../radar/types";
import type { KpiSnapshotFile } from "../snapshots/types";
import { getCurrentWeekRange } from "../periods/dateRange";
import { computeTeamFlowMetrics } from "../periods/issuePeriodMetrics";
import { buildDeliveryRiskItems } from "../radar/deliveryRisk";
import { summarizeTeamRadar } from "../radar/teamRadar";
import type { HomeTeamWorkspace } from "../home/homeTypes";
import type { DigestMetrics } from "./digestMetrics";
import { buildMetricsChangeLines, collectTeamDigestMetrics } from "./digestMetrics";
import { buildDigestId, getLocalWeekKey } from "./digestIds";
import { finalizeDigest } from "./formatDigest";
import type { OperationalDigest } from "./digestTypes";
import type { FeedbackActionSummary } from "../feedback/feedbackActionSummary";
import type { OperationalRules } from "../operationalRules/operationalRulesTypes";
import { DEFAULT_OPERATIONAL_RULES } from "../operationalRules/operationalRulesDefaults";
import type { DeliveryRiskRow } from "../performance";

export interface BuildWeeklyManagerDigestInput {
  snapshot: TeamSnapshot;
  reportData: AuditReportData;
  radarItems: TeamRadarItem[];
  kpiSnapshots: KpiSnapshotFile;
  team?: HomeTeamWorkspace;
  deliveryRisk: DeliveryRiskRow[];
  previousMetrics?: DigestMetrics;
  feedback?: FeedbackActionSummary;
  operationalRules?: OperationalRules;
  now?: Date;
}

export function buildWeeklyManagerDigest(
  input: BuildWeeklyManagerDigestInput,
): OperationalDigest {
  const now = input.now ?? new Date();
  const params = input.reportData.params;
  const rules = input.operationalRules ?? DEFAULT_OPERATIONAL_RULES;
  const weekFlow = computeTeamFlowMetrics(
    input.snapshot.persons,
    getCurrentWeekRange(now),
    params,
  );
  const deliveryRisk = buildDeliveryRiskItems(
    input.snapshot,
    params,
    now,
    rules,
  );
  const radarSummary = summarizeTeamRadar(input.radarItems);
  const currentMetrics = collectTeamDigestMetrics({
    snapshot: input.snapshot,
    deliveryRisk: input.deliveryRisk,
    params,
    completedInWeek: weekFlow.completedCount,
    backflowInWeek: weekFlow.backflowCount,
    rules,
    now,
  });
  const changeLines = buildMetricsChangeLines(
    input.previousMetrics,
    currentMetrics,
  );

  const avgCycleDays =
    weekFlow.avgCycleMs !== null
      ? (weekFlow.avgCycleMs / (24 * 60 * 60 * 1000)).toFixed(1)
      : "—";

  const sections = [
    {
      id: "week",
      title: "This week",
      lines: [
        `Completed: ${weekFlow.completedCount}`,
        `First pass: ${weekFlow.firstPassPercent}%`,
        `Avg cycle: ${avgCycleDays} days`,
        `Backflows: ${weekFlow.backflowCount}`,
      ],
    },
    {
      id: "delivery",
      title: "Delivery changes",
      lines: changeLines,
    },
    {
      id: "attention",
      title: "Attention",
      lines: [
        `${deliveryRisk.length} tasks at delivery risk`,
        radarSummary.peopleNeedingAttention
          ? `${radarSummary.peopleNeedingAttention} people on Team Radar`
          : "No team radar escalations",
        `${currentMetrics.overloadedPeople} with high or overloaded workload`,
      ],
    },
    {
      id: "availability",
      title: "Upcoming availability",
      lines: input.team
        ? [
            `${input.team.awayNextWeek} people away next week`,
            ...input.team.availabilityPreview.slice(0, 5).map(
              (r) => `${r.personName} · ${r.rangeLabel}`,
            ),
          ]
        : [`${currentMetrics.vacationSoonCount} starting leave soon`],
    },
    {
      id: "starters",
      title: "New starters",
      lines: input.team?.newStarters.length
        ? input.team.newStarters.map((s) => `${s.personName} · ${s.dayLabel}`)
        : ["No new starters among direct reports."],
    },
    {
      id: "feedback",
      title: "Feedback progress",
      lines: buildFeedbackLines(input.feedback),
    },
  ];

  const weekKey = getLocalWeekKey(now);
  return finalizeDigest({
    kind: "weekly",
    role: "manager",
    id: buildDigestId("weekly", "manager", now),
    periodLabel: `Week of ${weekKey}`,
    generatedAt: now.toISOString(),
    sinceLabel: "Calendar week (Mon–Sun, local)",
    sections,
    summaryLine: `${weekFlow.completedCount} completed · ${deliveryRisk.length} at risk`,
  });
}

function buildFeedbackLines(feedback?: FeedbackActionSummary): string[] {
  if (!feedback) return ["No feedback activity this week."];
  const lines: string[] = [];
  if (feedback.preparedNotSent) lines.push("Survey prepared, not sent");
  if (feedback.pendingResponseCount) {
    lines.push(`${feedback.pendingResponseCount} responses pending`);
  }
  if (feedback.deliveryFailureCount) {
    lines.push(`${feedback.deliveryFailureCount} delivery failures remain`);
  }
  return lines.length ? lines : ["Surveys on track."];
}

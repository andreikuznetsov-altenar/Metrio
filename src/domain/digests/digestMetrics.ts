import type { TeamSnapshot } from "../people/types";
import type { DeliveryRiskRow } from "../performance";
import { getActiveIssues } from "../radar/taskSignals";
import type { ReportParams } from "../jira/types";
import { classifyIssueAttention } from "../radar/taskSignals";
import { DEFAULT_OPERATIONAL_RULES } from "../operationalRules/operationalRulesDefaults";
import type { OperationalRules } from "../operationalRules/operationalRulesTypes";

export interface DigestMetrics {
  deliveryRiskCount: number;
  problematicTaskCount: number;
  completedInWeek: number;
  backflowInWeek: number;
  attentionIssueKeys: string[];
  overloadedPeople: number;
  vacationSoonCount: number;
}

export function collectTeamDigestMetrics(input: {
  snapshot: TeamSnapshot;
  deliveryRisk: DeliveryRiskRow[];
  params: ReportParams;
  completedInWeek: number;
  backflowInWeek: number;
  rules?: OperationalRules;
  now?: Date;
}): DigestMetrics {
  const rules = input.rules ?? DEFAULT_OPERATIONAL_RULES;
  const now = input.now ?? new Date();
  const attentionIssueKeys: string[] = [];
  for (const person of input.snapshot.persons) {
    for (const issue of getActiveIssues(person, input.params)) {
      const attention = classifyIssueAttention(
        issue,
        input.params,
        now,
        rules,
      );
      if (attention) attentionIssueKeys.push(issue.issueKey);
    }
  }
  const overloaded = input.snapshot.persons.filter(
    (p) => p.workload?.level === "high" || p.workload?.level === "overloaded",
  ).length;
  const vacationSoon = input.snapshot.persons.filter(
    (p) =>
      p.availability.state === "vacation_soon" ||
      p.availability.state === "vacation_tomorrow",
  ).length;
  return {
    deliveryRiskCount: input.deliveryRisk.length,
    problematicTaskCount: attentionIssueKeys.length,
    completedInWeek: input.completedInWeek,
    backflowInWeek: input.backflowInWeek,
    attentionIssueKeys: [...new Set(attentionIssueKeys)].sort(),
    overloadedPeople: overloaded,
    vacationSoonCount: vacationSoon,
  };
}

export function buildMetricsChangeLines(
  previous: DigestMetrics | undefined,
  current: DigestMetrics,
): string[] {
  if (!previous) {
    return ["Changes will be compared after your next brief."];
  }
  const lines: string[] = [];
  const drDelta = current.deliveryRiskCount - previous.deliveryRiskCount;
  if (drDelta > 0) {
    lines.push(`${drDelta} new delivery risk${drDelta === 1 ? "" : "s"}`);
  } else if (drDelta < 0) {
    lines.push(`${-drDelta} delivery risk${-drDelta === 1 ? "" : "s"} cleared`);
  }
  const completedDelta = current.completedInWeek - previous.completedInWeek;
  if (completedDelta > 0) {
    lines.push(`${completedDelta} more completed this week`);
  }
  const backflowDelta = current.backflowInWeek - previous.backflowInWeek;
  if (backflowDelta > 0) {
    lines.push(`${backflowDelta} new backflow signal${backflowDelta === 1 ? "" : "s"}`);
  }
  const prevSet = new Set(previous.attentionIssueKeys);
  const resolved = previous.attentionIssueKeys.filter(
    (key) => !current.attentionIssueKeys.includes(key),
  );
  if (resolved.length) {
    lines.push(
      `${resolved.length} previous attention item${resolved.length === 1 ? "" : "s"} no longer active`,
    );
  }
  const newAttention = current.attentionIssueKeys.filter((key) => !prevSet.has(key));
  if (newAttention.length) {
    lines.push(
      `${newAttention.length} task${newAttention.length === 1 ? "" : "s"} need attention`,
    );
  }
  if (!lines.length) {
    lines.push("No significant delivery changes since your last brief.");
  }
  return lines;
}

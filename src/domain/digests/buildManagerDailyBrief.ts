import type { ActionItem } from "../actions/actionTypes";
import type { HomeTeamWorkspace } from "../home/homeTypes";
import type { DigestMetrics } from "./digestMetrics";
import { buildMetricsChangeLines } from "./digestMetrics";
import { buildDigestId } from "./digestIds";
import { finalizeDigest } from "./formatDigest";
import type { OperationalDigest } from "./digestTypes";
import { getLocalDateKey } from "../periods/dateRange";
import type { FeedbackActionSummary } from "../feedback/feedbackActionSummary";

export interface BuildManagerDailyBriefInput {
  team: HomeTeamWorkspace;
  teamActions: ActionItem[];
  previousMetrics?: DigestMetrics;
  currentMetrics: DigestMetrics;
  feedback?: FeedbackActionSummary;
  onboardingStarterLines?: string[];
  now?: Date;
}

export function buildManagerDailyBrief(
  input: BuildManagerDailyBriefInput,
): OperationalDigest {
  const now = input.now ?? new Date();
  const actionLines = input.teamActions.slice(0, 8).map((a) => a.title);
  const deliveryLines = buildMetricsChangeLines(
    input.previousMetrics,
    input.currentMetrics,
  );

  const availabilityLines = input.team.availabilityPreview.map(
    (row) => `${row.personName} · ${row.rangeLabel}`,
  );
  const starterLines = input.team.newStarters.map(
    (s) => `${s.personName} · ${s.dayLabel}`,
  );

  const feedbackLines: string[] = [];
  if (input.feedback?.preparedNotSent) {
    feedbackLines.push("Survey prepared but not sent");
  }
  if (input.feedback?.pendingResponseCount) {
    feedbackLines.push(
      `${input.feedback.pendingResponseCount} pending survey responses`,
    );
  }
  if (input.feedback?.deliveryFailureCount) {
    feedbackLines.push(
      `${input.feedback.deliveryFailureCount} delivery failure${input.feedback.deliveryFailureCount === 1 ? "" : "s"}`,
    );
  }
  if (input.feedback?.activeCycleProgress) {
    feedbackLines.push(`Feedback cycle · ${input.feedback.activeCycleProgress}`);
  }

  const onboardingLines = input.onboardingStarterLines ?? [];

  const sections = [
    {
      id: "actions",
      title: "Team actions",
      lines: actionLines.length ? actionLines : ["No high-priority team actions."],
    },
    {
      id: "delivery",
      title: "Delivery changes",
      lines: deliveryLines,
    },
    {
      id: "availability",
      title: "Upcoming availability",
      lines: availabilityLines.length
        ? availabilityLines
        : [`${input.team.awayNextWeek} people away in the next 7 days`],
    },
    {
      id: "starters",
      title: "New starters",
      lines: starterLines.length ? starterLines : ["No new starters in direct reports."],
    },
    ...(onboardingLines.length
      ? [
          {
            id: "onboarding",
            title: "Onboarding",
            lines: onboardingLines,
          },
        ]
      : []),
    {
      id: "feedback",
      title: "Feedback",
      lines: feedbackLines.length ? feedbackLines : ["No feedback actions pending."],
    },
  ];

  const summaryLine =
    actionLines[0] ??
    deliveryLines[0] ??
    `Team delivery: ${input.team.deliverySummary.problematic} at risk`;

  return finalizeDigest({
    kind: "daily",
    role: "manager",
    id: buildDigestId("daily", "manager", now),
    periodLabel: `Team brief · ${getLocalDateKey(now)}`,
    generatedAt: now.toISOString(),
    sinceLabel: "Since your previous daily brief",
    sections,
    summaryLine,
  });
}

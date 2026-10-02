import { getEfficiencyScoreBreakdown } from "../../domain/jira/kpi";
import type { AnalyticsEvidence, AnalyticsEvidenceIssue } from "../../domain/analytics/analyticsEvidenceTypes";

/** Strip Jira-style `Name <email>` for display rows. */
export function displayPersonName(raw?: string): string {
  if (!raw) return "—";
  const withoutBracket = raw.replace(/\s*<[^>]+>/g, "").trim();
  return withoutBracket || raw.trim();
}

export function buildContextLine(evidence: AnalyticsEvidence): string {
  const parts = [evidence.rangeLabel, evidence.targetLabel];
  if (evidence.comparisonLabel) {
    parts.push(evidence.comparisonLabel);
  }
  return parts.filter(Boolean).join("  ·  ");
}

export function completedCyclesCaption(issues: AnalyticsEvidenceIssue[]): string {
  const cycles = issues.length;
  if (cycles === 0) return "0 completed cycles";
  const uniqueIssues = new Set(issues.map((issue) => issue.issueKey)).size;
  const base = `${cycles} completed cycle${cycles === 1 ? "" : "s"}`;
  if (uniqueIssues < cycles) {
    return `${base} across ${uniqueIssues} Jira issue${uniqueIssues === 1 ? "" : "s"}`;
  }
  return base;
}

export function medianCycleMs(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function formatCycleDurationShort(ms: number | null | undefined): string | null {
  if (ms == null || ms < 0) return null;
  const days = ms / 86400000;
  if (days >= 1) return `${days.toFixed(1)}d`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export interface EfficiencyRowPresentation {
  id: string;
  label: string;
  points: string;
  detail: string;
  isPenalty?: boolean;
}

export function efficiencyBreakdownRows(
  evidence: AnalyticsEvidence,
): { rows: EfficiencyRowPresentation[]; total: string } {
  const kpi = evidence.kpi;
  const breakdown = getEfficiencyScoreBreakdown({
    startedCount: kpi.startedCount,
    completedCount: kpi.completedCount,
    firstPassAcceptedCount: kpi.firstPassAcceptedCount,
    backflowCount: kpi.backflowCount,
    avgProgressToReviewMs: kpi.avgProgressToReviewMs,
    targetReviewDays: kpi.targetReviewDays,
  });

  const cycleDetail =
    breakdown.progressToReviewHours != null
      ? `${breakdown.progressToReviewHours.toFixed(1)}h avg · ${breakdown.targetReviewHours}h target`
      : "Progress to review data unavailable";

  return {
    rows: [
      {
        id: "completion",
        label: "Completion",
        points: `${breakdown.completionScore} / 35`,
        detail: `${kpi.completedCount} of ${kpi.startedCount} eligible cycles completed`,
      },
      {
        id: "first_pass",
        label: "First pass",
        points: `${breakdown.firstPassScore} / 35`,
        detail: `${kpi.firstPassAcceptedCount} of ${kpi.completedCount} completed without rework`,
      },
      {
        id: "speed",
        label: "Cycle time",
        points: `${breakdown.speedScore} / 30`,
        detail: cycleDetail,
      },
      {
        id: "backflow",
        label: "Backflow penalty",
        points: breakdown.backflowPenalty > 0 ? `−${breakdown.backflowPenalty}` : "0",
        detail: `${kpi.backflowCount} qualifying backflow${kpi.backflowCount === 1 ? "" : "s"}`,
        isPenalty: true,
      },
    ],
    total: `${breakdown.total} / 100`,
  };
}

export function summaryLineValue(
  evidence: AnalyticsEvidence,
  label: string,
): string | undefined {
  return evidence.summaryLines.find((line) => line.label === label)?.value;
}

export function isBackflowsZeroState(evidence: AnalyticsEvidence): boolean {
  return (
    evidence.metric === "backflows" &&
    evidence.detailLevel === "task" &&
    evidence.kpi.backflowCount === 0 &&
    evidence.issues.length === 0
  );
}

/** Single list caption before evidence rows (avoids duplicate with outcome blocks). */
export function shouldShowEvidenceListCaption(
  evidence: AnalyticsEvidence,
  filteredIssueCount: number,
  backflowsZero: boolean,
): boolean {
  if (backflowsZero) return false;
  if (evidence.detailLevel !== "task") return false;
  if (filteredIssueCount === 0) return false;
  if (evidence.metric === "efficiency") return false;
  return true;
}

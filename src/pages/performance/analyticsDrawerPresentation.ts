import { formatDuration } from "../../domain/jira/dates";
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
  const formatted = formatDuration(ms);
  return formatted || null;
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
    evidence.kpi.backflowEventCount === 0 &&
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
  return true;
}

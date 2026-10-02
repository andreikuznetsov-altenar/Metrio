import { ExternalLink } from "lucide-react";
import { Badge } from "../../components/Badge/Badge";
import { IconButton } from "../../components/IconButton/IconButton";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { AnalyticsEvidenceIssue } from "../../domain/analytics/analyticsEvidenceTypes";
import { formatPerformanceDateDisplay } from "../../domain/performance/performanceDateRange";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { openExternalUrl } from "../../platform/openExternal";
import "./analytics-issue-row.css";

function outcomeBadge(outcome: AnalyticsEvidenceIssue["outcome"]) {
  if (outcome === "first_pass") return { label: "First pass", variant: "success" as const };
  if (outcome === "rework") return { label: "Rework", variant: "warning" as const };
  if (outcome === "backflow") return { label: "Backflow", variant: "danger" as const };
  return null;
}

function formatDuration(ms: number | null | undefined): string | null {
  if (ms == null || ms < 0) return null;
  const days = ms / 86400000;
  if (days >= 1) return `${days.toFixed(1)}d cycle`;
  const hours = ms / 3600000;
  return `${hours.toFixed(1)}h cycle`;
}

export interface AnalyticsIssueRowProps {
  issue: AnalyticsEvidenceIssue;
  onOpenPerson?: (personId: string) => void;
  showOutcome?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function AnalyticsIssueRow({
  issue,
  onOpenPerson,
  showOutcome = true,
  expanded = false,
  onToggleExpand,
}: AnalyticsIssueRowProps) {
  const badge = showOutcome ? outcomeBadge(issue.outcome) : null;
  const completedLabel = issue.completedAt
    ? formatPerformanceDateDisplay(issue.completedAt.slice(0, 10))
    : null;
  const durationLabel = formatDuration(issue.cycleDurationMs);
  const hasBackflowDetails = (issue.backflowEvents?.length ?? 0) > 0;

  return (
    <div className="analytics-issue-row">
      <div className="analytics-issue-row__main">
        <div className="analytics-issue-row__text">
          <div className="analytics-issue-row__key-line">
            <span className="analytics-issue-row__key">{issue.issueKey}</span>
            {issue.cycleLabel ? (
              <span className="analytics-issue-row__cycle">{issue.cycleLabel}</span>
            ) : null}
          </div>
          <div className="analytics-issue-row__title" title={issue.title}>
            {issue.title}
          </div>
          <div className="analytics-issue-row__meta">
            {issue.personId && issue.personName ? (
              <button
                type="button"
                className="analytics-issue-row__person"
                onClick={() => onOpenPerson?.(issue.personId!)}
              >
                {issue.personName}
              </button>
            ) : (
              <span>{issue.personName || "—"}</span>
            )}
            {completedLabel ? <span> · {completedLabel}</span> : null}
            {durationLabel ? <span> · {durationLabel}</span> : null}
            {(issue.backflowCount ?? 0) > 0 ? (
              <span> · {issue.backflowCount} backflow{(issue.backflowCount ?? 0) === 1 ? "" : "s"}</span>
            ) : null}
          </div>
        </div>
        <div className="analytics-issue-row__actions">
          {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
          <Tooltip content="Open in Jira">
            <IconButton
              label={`Open ${issue.issueKey} in Jira`}
              onClick={() => {
                void (async () => {
                  const prefs = await loadPreferences();
                  const url = buildJiraIssueBrowseUrl(
                    resolveJiraBaseUrl(prefs),
                    issue.issueKey,
                  );
                  await openExternalUrl(url);
                })();
              }}
            >
              <ExternalLink size={14} strokeWidth={1.75} />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      {hasBackflowDetails && onToggleExpand ? (
        <button
          type="button"
          className="analytics-issue-row__expand"
          aria-expanded={expanded}
          onClick={onToggleExpand}
        >
          {expanded ? "Hide transitions" : "Show transitions"}
        </button>
      ) : null}
      {expanded && issue.backflowEvents?.length ? (
        <ul className="analytics-issue-row__transitions">
          {issue.backflowEvents.map((event) => (
            <li key={`${event.changedAt}-${event.transitionLabel}`}>
              {formatPerformanceDateDisplay(event.changedAt.slice(0, 10))}{" "}
              {event.transitionLabel}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

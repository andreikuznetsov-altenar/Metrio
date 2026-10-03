import { ExternalLink } from "lucide-react";
import { Badge } from "../../components/Badge/Badge";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { AnalyticsEvidenceIssue } from "../../domain/analytics/analyticsEvidenceTypes";
import { formatPerformanceDateDisplay } from "../../domain/performance/performanceDateRange";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { openExternalUrl } from "../../platform/openExternal";
import {
  displayPersonName,
  formatCycleDurationShort,
} from "./analyticsDrawerPresentation";
import "./analytics-issue-row.css";

function outcomeBadge(outcome: AnalyticsEvidenceIssue["outcome"]) {
  if (outcome === "first_pass") return { label: "First pass", variant: "success" as const };
  if (outcome === "rework") return { label: "Rework", variant: "warning" as const };
  if (outcome === "backflow") return { label: "Backflow", variant: "danger" as const };
  return null;
}

export interface AnalyticsIssueRowProps {
  issue: AnalyticsEvidenceIssue;
  onOpenPerson?: (personId: string) => void;
  showOutcome?: boolean;
  showBackflowSummary?: boolean;
  hidePerson?: boolean;
  /** When set (e.g. work history), replaces default meta composition. */
  metaLine?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function AnalyticsIssueRow({
  issue,
  onOpenPerson,
  showOutcome = true,
  showBackflowSummary = false,
  hidePerson = false,
  metaLine,
  expanded = false,
  onToggleExpand,
}: AnalyticsIssueRowProps) {
  const badge = showOutcome ? outcomeBadge(issue.outcome) : null;
  const personLabel = displayPersonName(issue.personName);
  const completedLabel = issue.completedAt
    ? formatPerformanceDateDisplay(issue.completedAt.slice(0, 10))
    : null;
  const durationLabel = formatCycleDurationShort(issue.cycleDurationMs);
  const hasBackflowDetails = (issue.backflowEvents?.length ?? 0) > 0;
  const metaParts =
    metaLine !== undefined
      ? metaLine
        ? [metaLine]
        : []
      : (
          [
            issue.cycleLabel && issue.cycleLabel !== "—" ? issue.cycleLabel : null,
            completedLabel,
            durationLabel ? `Cycle ${durationLabel}` : null,
            showBackflowSummary && (issue.backflowCount ?? 0) > 0
              ? `${issue.backflowCount} backflow${(issue.backflowCount ?? 0) === 1 ? "" : "s"}`
              : null,
          ].filter(Boolean) as string[]
        );

  return (
    <article className="analytics-issue-row">
      <div className="analytics-issue-row__top">
        <div className="analytics-issue-row__key-line">
          <span className="analytics-issue-row__key">{issue.issueKey}</span>
        </div>
        {badge ? (
          <Badge variant={badge.variant} className="analytics-issue-row__badge">
            {badge.label}
          </Badge>
        ) : null}
      </div>

      <h4 className="analytics-issue-row__title" title={issue.title}>
        {issue.title}
      </h4>

      <div className="analytics-issue-row__footer">
        <div className="analytics-issue-row__person-line">
          {!hidePerson && issue.personId ? (
            <PersonAvatar
              employeeId={issue.personId}
              displayName={personLabel}
              size="sm"
            />
          ) : null}
          {!hidePerson && issue.personId && onOpenPerson ? (
            <button
              type="button"
              className="analytics-issue-row__person"
              onClick={() => onOpenPerson(issue.personId!)}
              aria-label={`Open ${personLabel} details`}
            >
              {personLabel}
            </button>
          ) : !hidePerson ? (
            <span className="analytics-issue-row__person-static">{personLabel}</span>
          ) : null}
          {metaParts.length ? (
            <span className="analytics-issue-row__meta">{metaParts.join(" · ")}</span>
          ) : null}
        </div>

        <Tooltip content="Open in Jira">
          <button
            type="button"
            className="analytics-issue-row__jira"
            aria-label={`Open ${issue.issueKey} in Jira`}
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
            <ExternalLink size={15} strokeWidth={1.75} aria-hidden />
          </button>
        </Tooltip>
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
              {formatPerformanceDateDisplay(event.changedAt.slice(0, 10))} ·{" "}
              {event.transitionLabel.replace(" → ", " → ")}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

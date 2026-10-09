import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import type { AuditIssue, ReportParams } from '../../domain/jira/types';
import {
  buildTaskJourney,
  formatSegmentDurationLabel,
  type TaskJourney,
  type TaskJourneyTimelineEntry,
} from '../../domain/task-journey/buildTaskJourney';
import { deliveryStatusBadgeVariant } from '../../domain/performance/performanceStatusBadges';
import type { OperationalRules } from '../../domain/operationalRules/operationalRulesTypes';
import type { Person } from '../../domain/people/types';
import { buildJiraIssueBrowseUrl } from '../../platform/jiraIssueUrl';
import { loadPreferences } from '../../platform/preferences';
import { openExternalUrl } from '../../platform/openExternal';
import { resolveJiraBaseUrl } from '../../config/product';
import { useOptionalPersonNavigation } from '../../app/PersonNavigationContext';
import './TaskJourneyDrawer.css';

function formatTimelineDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, 'd MMM');
}

function TimelineItem({ entry }: { entry: TaskJourneyTimelineEntry }) {
  if (entry.kind === 'assignee_change') {
    return (
      <li className="task-journey-timeline__item" data-testid="task-journey-assignee">
        <span className="task-journey-timeline__dot" aria-hidden />
        <span className="task-journey-timeline__connector" aria-hidden />
        <div className="task-journey-timeline__assignee">
          {formatTimelineDate(entry.changedAt)} · {entry.fromAssignee} → {entry.toAssignee}
          <div>Assignee changed</div>
        </div>
      </li>
    );
  }

  const duration = entry.isCurrent
    ? formatSegmentDurationLabel(entry.stageDurationMs)
    : formatSegmentDurationLabel(entry.stageDurationMs);

  return (
    <li
      className={[
        'task-journey-timeline__item',
        entry.isCurrent ? 'task-journey-timeline__item--current' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="task-journey-status"
    >
      <span className="task-journey-timeline__dot" aria-hidden />
      <span className="task-journey-timeline__connector" aria-hidden />
      <div className="task-journey-timeline__title">
        {entry.isCurrent ? entry.stageLabel : `${entry.fromStatus} → ${entry.toStatus}`}
      </div>
      <div className="task-journey-timeline__meta">
        {entry.isCurrent ? (
          <>
            since {formatTimelineDate(entry.changedAt)}
            {duration ? ` · ${duration}` : ''} · Current
          </>
        ) : (
          <>
            {formatTimelineDate(entry.changedAt)}
            {duration ? ` · ${duration}` : ''}
          </>
        )}
      </div>
      {entry.isBackflow && !entry.excludeFromEfficiencyBackflow ? (
        <span className="task-journey-timeline__backflow">↩ Backflow</span>
      ) : null}
    </li>
  );
}

function OwnerLink({
  name,
  personId,
  onOpenPerson,
}: {
  name: string;
  personId?: string;
  onOpenPerson?: (personId: string) => void;
}) {
  if (personId && onOpenPerson) {
    return (
      <button
        type="button"
        className="performance-table__person-link task-journey-drawer__owner-link"
        onClick={() => onOpenPerson(personId)}
      >
        {name}
      </button>
    );
  }
  return <span>{name}</span>;
}

function DiagnosticRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="task-journey-drawer__diag-row">
      <span className="task-journey-drawer__diag-label">{label}</span>
      <span className="task-journey-drawer__diag-value">{value}</span>
    </div>
  );
}

export interface TaskJourneyDrawerProps {
  open: boolean;
  issue: AuditIssue | null;
  params: ReportParams;
  rules: OperationalRules;
  persons?: Person[];
  dependencyBlockerKey?: string;
  changelogUnavailable?: boolean;
  onClose: () => void;
}

export function TaskJourneyDrawer({
  open,
  issue,
  params,
  rules,
  persons,
  dependencyBlockerKey,
  changelogUnavailable,
  onClose,
}: TaskJourneyDrawerProps) {
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const personNavigation = useOptionalPersonNavigation();
  const openPerson = personNavigation?.openPerson;

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);

  const journey: TaskJourney | null = useMemo(() => {
    if (!issue) return null;
    return buildTaskJourney({
      issue,
      params,
      rules,
      persons,
      dependencyBlockerKey,
      changelogUnavailable,
    });
  }, [issue, params, rules, persons, dependencyBlockerKey, changelogUnavailable]);

  const issueUrl = issue ? buildJiraIssueBrowseUrl(jiraBaseUrl, issue.issueKey) : '';

  const stageDurationLabel = journey
    ? journey.problem.isAttentionEligible && journey.problem.severity
      ? `Stuck for ${journey.problem.currentStageAgeLabel}`
      : journey.problem.currentStageAgeLabel !== '—'
        ? `Current for ${journey.problem.currentStageAgeLabel}`
        : null
    : null;

  const header = journey ? (
    <div className="task-journey-drawer__header">
      <h2 className="task-journey-drawer__issue-key">{journey.issueKey}</h2>
      <p className="task-journey-drawer__title">{journey.title}</p>
      <div className="task-journey-drawer__header-badges">
        {journey.problem.severity ? (
          <Badge variant="danger">Needs attention</Badge>
        ) : null}
        <Badge variant={deliveryStatusBadgeVariant(journey.currentStatus)}>
          {journey.currentStatus}
        </Badge>
      </div>
      {stageDurationLabel ? (
        <p className="task-journey-drawer__stage-duration" data-testid="task-journey-stage-duration">
          {stageDurationLabel}
        </p>
      ) : null}
      <p className="task-journey-drawer__header-owner">
        <span className="task-journey-drawer__header-owner-label">Current owner</span>
        <OwnerLink
          name={journey.currentOwner.name}
          personId={journey.currentOwner.personId}
          onOpenPerson={openPerson}
        />
      </p>
    </div>
  ) : null;

  const currentStageLine =
    journey && journey.problem.currentStageAgeLabel !== '—'
      ? `${journey.currentStatus} · ${journey.problem.currentStageAgeLabel}`
      : journey?.currentStatus ?? '—';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Task journey"
      header={header}
      className="task-journey-drawer"
      footer={
        journey ? (
          <div className="task-journey-drawer__footer-actions">
            <Button
              type="button"
              variant="primary"
              disabled={!issueUrl}
              onClick={() => {
                if (issueUrl) void openExternalUrl(issueUrl);
              }}
            >
              Open in Jira
            </Button>
          </div>
        ) : undefined
      }
    >
      {journey ? (
        <div className="metrio-scroll metrio-scroll--hidden-thumb" data-testid="task-journey-drawer">
          <section className="task-journey-drawer__section" aria-label="Why this needs attention">
            <h3 className="task-journey-drawer__section-title">Why this needs attention</h3>
            <p className="task-journey-drawer__attention-lead">{journey.problem.headline}</p>
            <div className="task-journey-drawer__diag-block" data-testid="task-journey-diagnostic-block">
              <DiagnosticRow label="Reason" value={journey.problem.primaryReason} />
              <DiagnosticRow label="Current stage" value={currentStageLine} />
              {journey.problem.targetReviewDays ? (
                <DiagnosticRow
                  label="Target"
                  value={`${journey.problem.targetReviewDays} days`}
                />
              ) : null}
              {journey.problem.lastActivityLabel ? (
                <DiagnosticRow label="Last activity" value={journey.problem.lastActivityLabel} />
              ) : null}
              <DiagnosticRow
                label="Current owner"
                value={
                  <OwnerLink
                    name={journey.currentOwner.name}
                    personId={journey.currentOwner.personId}
                    onOpenPerson={openPerson}
                  />
                }
              />
            </div>
          </section>

          <section className="task-journey-drawer__section" aria-label="Task path">
            <h3 className="task-journey-drawer__section-title">Task path</h3>
            {journey.historyNotice ? (
              <p className="task-journey-drawer__notice">{journey.historyNotice}</p>
            ) : null}
            <p className="task-journey-drawer__path">{journey.compressedPath}</p>
            <ol className="task-journey-timeline">
              {journey.timeline.map((entry, index) => (
                <TimelineItem key={`${entry.kind}-${entry.changedAt}-${index}`} entry={entry} />
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

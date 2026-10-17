import { useEffect, useMemo, useState } from 'react';
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
import { MetaList, MetaRow } from '../MetaList/MetaList';
import { taskPathTagStyle } from '../../domain/task-journey/taskPathTagStyle';
import { StaleCompletionAction } from './StaleCompletionAction';
import type { IssueCompletionService } from '../../services/jira/issueCompletionService';
import type { VerifiedIssueState } from '../../domain/jira/applyVerifiedIssueState';
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
      {entry.isBackflow && !entry.excludeFromBackflow ? (
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

export interface TaskJourneyDrawerProps {
  open: boolean;
  issue: AuditIssue | null;
  params: ReportParams;
  rules: OperationalRules;
  persons?: Person[];
  dependencyBlockerKey?: string;
  changelogUnavailable?: boolean;
  /** Enables the stale Review/Hold "Mark complete" action. Absent = action never shown. */
  completionService?: IssueCompletionService;
  onIssueVerified?: (verified: VerifiedIssueState) => void;
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
  completionService,
  onIssueVerified,
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
            {issue && completionService && onIssueVerified ? (
              <StaleCompletionAction
                issue={issue}
                service={completionService}
                onVerified={onIssueVerified}
              />
            ) : null}
          </div>
        ) : undefined
      }
    >
      {journey ? (
        <div className="task-journey-drawer__content" data-testid="task-journey-drawer">
          <section className="task-journey-drawer__section" aria-label="Why this needs attention">
            <h3 className="task-journey-drawer__section-title">Why this needs attention</h3>
            <p className="task-journey-drawer__attention-lead">{journey.problem.headline}</p>
            <MetaList testId="task-journey-diagnostic-block">
              <MetaRow label="Reason">{journey.problem.primaryReason}</MetaRow>
              <MetaRow label="Current stage">{currentStageLine}</MetaRow>
              {journey.problem.stageTargetDays ? (
                <MetaRow label="Target">{`${journey.problem.stageTargetDays} weekdays`}</MetaRow>
              ) : null}
              {journey.problem.lastActivityLabel ? (
                <MetaRow label="Last activity">{journey.problem.lastActivityLabel}</MetaRow>
              ) : null}
              <MetaRow label="Current owner">
                <OwnerLink
                  name={journey.currentOwner.name}
                  personId={journey.currentOwner.personId}
                  onOpenPerson={openPerson}
                />
              </MetaRow>
            </MetaList>
          </section>

          <section className="task-journey-drawer__section" aria-label="Task path">
            <h3 className="task-journey-drawer__section-title">Task path</h3>
            {journey.historyNotice ? (
              <p className="task-journey-drawer__notice">{journey.historyNotice}</p>
            ) : null}
            <ul
              className="task-journey-path"
              aria-label={`Task path: ${journey.pathStages.map((stage) => stage.status).join(', ')}`}
              data-testid="task-journey-path"
            >
              {journey.pathStages.map((stage, index) => {
                const style = taskPathTagStyle(issue as AuditIssue, stage.status);
                return (
                  <li key={`${stage.status}-${index}`} className="task-journey-path__item">
                    <Badge
                      variant={style.variant}
                      className={[
                        'task-journey-path__tag',
                        style.muted ? 'task-journey-path__tag--muted' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-testid="task-journey-path-tag"
                    >
                      {stage.status}
                    </Badge>
                  </li>
                );
              })}
            </ul>
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

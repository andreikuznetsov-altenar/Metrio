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
import type { OperationalRules } from '../../domain/operationalRules/operationalRulesTypes';
import type { Person } from '../../domain/people/types';
import { buildJiraIssueBrowseUrl } from '../../platform/jiraIssueUrl';
import { loadPreferences } from '../../platform/preferences';
import { openExternalUrl } from '../../platform/openExternal';
import { resolveJiraBaseUrl } from '../../config/product';
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

  const stuckLabel =
    journey?.problem.isAttentionEligible && journey.problem.severity
      ? `Stuck for ${journey.problem.currentStageAgeLabel}`
      : journey?.problem.currentStageAgeLabel !== '—'
        ? `Current for ${journey?.problem.currentStageAgeLabel}`
        : null;

  const header = journey ? (
    <div>
      <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{journey.issueKey}</h2>
      <p className="task-journey-drawer__title">{journey.title}</p>
      <div className="task-journey-drawer__header-meta">
        {journey.problem.severity ? (
          <Badge variant="danger">Needs attention</Badge>
        ) : null}
        <span>Current owner: {journey.currentOwner.name}</span>
        <span>Current status: {journey.currentStatus}</span>
        {stuckLabel ? <span>{stuckLabel}</span> : null}
      </div>
    </div>
  ) : null;

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
            {journey.problem.detailLines.map((line) => (
              <p key={line} className="task-journey-drawer__attention-detail">{line}</p>
            ))}
            <p className="task-journey-drawer__attention-detail">
              Current owner: {journey.currentOwner.name}
            </p>
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

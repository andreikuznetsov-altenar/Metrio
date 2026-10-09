import { format } from 'date-fns';
import { formatDuration, getWorkingDurationMs } from '../jira/dates';
import type { AuditIssue, ReportParams } from '../jira/types';
import { DEFAULT_OPERATIONAL_RULES } from '../operationalRules/operationalRulesDefaults';
import type { OperationalRules } from '../operationalRules/operationalRulesTypes';
import type { Person } from '../people/types';
import {
  classifyIssueAttention,
  formatStageAgeLabel,
} from '../radar/taskSignals';
import type { RadarSeverity } from '../radar/types';
import {
  classifyTaskHealth,
  getCurrentStageAgeMs,
} from '../task-health/taskHealthEngine';
import { taskHealthThresholdsFromRules } from '../operationalRules/normalizeOperationalRules';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';
import { compressStatusPath } from './compressStatusPath';
import { getFullIssueEventsSorted, getFullStatusEventsSorted } from './issueEvents';
import { resolveIssueCurrentOwner, type IssueCurrentOwner } from './resolveIssueCurrentOwner';

export type TaskJourneyTimelineKind = 'status_transition' | 'assignee_change';

export interface TaskJourneyStatusSegment {
  kind: 'status_transition';
  fromStatus: string;
  toStatus: string;
  changedAt: string;
  changedBy: string;
  durationSincePreviousStatusMs: number | null;
  canonicalFromStage?: string;
  canonicalToStage?: string;
  isBackflow: boolean;
  excludeFromEfficiencyBackflow: boolean;
  isCurrent: boolean;
  stageDurationMs: number | null;
  stageLabel: string;
}

export interface TaskJourneyAssigneeSegment {
  kind: 'assignee_change';
  fromAssignee: string;
  toAssignee: string;
  changedAt: string;
  changedBy: string;
  isHandoff: boolean;
  isReturnToTeam: boolean;
}

export type TaskJourneyTimelineEntry = TaskJourneyStatusSegment | TaskJourneyAssigneeSegment;

export interface TaskJourneyProblem {
  healthStatus: string;
  severity: RadarSeverity | null;
  primaryReason: string;
  reasons: string[];
  headline: string;
  detailLines: string[];
  currentStageAgeMs: number | null;
  currentStageAgeLabel: string;
  lastActivityAt: string | null;
  lastActivityLabel: string | null;
  backflowCount: number;
  targetReviewDays: number;
  isAttentionEligible: boolean;
}

export interface TaskJourney {
  issueKey: string;
  title: string;
  currentStatus: string;
  currentCanonicalStage: string;
  currentOwner: IssueCurrentOwner;
  compressedPath: string;
  historyComplete: boolean;
  historyNotice: string | null;
  problem: TaskJourneyProblem;
  timeline: TaskJourneyTimelineEntry[];
  statusSegments: TaskJourneyStatusSegment[];
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, 'd MMM yyyy');
}

function canonicalStageLabel(issue: AuditIssue, status: string): string {
  const profile = resolveWorkflowProfile(issue);
  return resolveWorkflowStage(profile, status).canonicalStage;
}

function workingDaysLabelFromMs(ms: number | null): string {
  if (ms === null) return '—';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return '<1 working day';
  return `${days} working day${days === 1 ? '' : 's'}`;
}

function buildStatusSegments(
  issue: AuditIssue,
  now: Date,
): TaskJourneyStatusSegment[] {
  const statusEvents = getFullStatusEventsSorted(issue);
  const currentStatus = issue.currentStatus?.trim() || '—';
  const segments: TaskJourneyStatusSegment[] = [];

  if (!statusEvents.length) {
    if (currentStatus && currentStatus !== '—') {
      const startedAt = issue.issueCreated || now.toISOString();
      const stageDurationMs = getWorkingDurationMs(startedAt, now.toISOString());
      segments.push({
        kind: 'status_transition',
        fromStatus: '',
        toStatus: currentStatus,
        changedAt: startedAt,
        changedBy: '',
        durationSincePreviousStatusMs: null,
        canonicalToStage: canonicalStageLabel(issue, currentStatus),
        isBackflow: false,
        excludeFromEfficiencyBackflow: false,
        isCurrent: true,
        stageDurationMs,
        stageLabel: currentStatus,
      });
    }
    return segments;
  }

  for (let i = 0; i < statusEvents.length; i++) {
    const event = statusEvents[i];
    const next = statusEvents[i + 1];
    const isLast = i === statusEvents.length - 1;
    const segmentStatus = event.toValue?.trim() || '—';
    const segmentStart = event.changedAt;
    const segmentEnd = next ? next.changedAt : now.toISOString();
    const isCurrent =
      isLast &&
      (segmentStatus === currentStatus ||
        segmentStatus.toLowerCase() === currentStatus.toLowerCase());

    const stageDurationMs = isCurrent || !next
      ? getWorkingDurationMs(segmentStart, now.toISOString())
      : getWorkingDurationMs(segmentStart, segmentEnd);

    segments.push({
      kind: 'status_transition',
      fromStatus: event.fromValue?.trim() || '—',
      toStatus: segmentStatus,
      changedAt: event.changedAt,
      changedBy: event.changedBy,
      durationSincePreviousStatusMs: event.timeSincePreviousStatusMs,
      canonicalFromStage: canonicalStageLabel(issue, event.fromValue),
      canonicalToStage: canonicalStageLabel(issue, segmentStatus),
      isBackflow: event.isBackflow,
      excludeFromEfficiencyBackflow: event.excludeFromEfficiencyBackflow,
      isCurrent,
      stageDurationMs,
      stageLabel: segmentStatus,
    });
  }

  const lastSegment = segments[segments.length - 1];
  if (lastSegment && !lastSegment.isCurrent && currentStatus) {
    const startedAt = statusEvents[statusEvents.length - 1].changedAt;
    const stageDurationMs = getWorkingDurationMs(startedAt, now.toISOString());
    segments.push({
      kind: 'status_transition',
      fromStatus: lastSegment.toStatus,
      toStatus: currentStatus,
      changedAt: startedAt,
      changedBy: '',
      durationSincePreviousStatusMs: null,
      canonicalToStage: canonicalStageLabel(issue, currentStatus),
      isBackflow: false,
      excludeFromEfficiencyBackflow: false,
      isCurrent: true,
      stageDurationMs,
      stageLabel: currentStatus,
    });
  }

  return segments;
}

function buildMergedTimeline(
  issue: AuditIssue,
  statusSegments: TaskJourneyStatusSegment[],
): TaskJourneyTimelineEntry[] {
  const segmentKey = (changedAt: string, toStatus: string) =>
    `${changedAt}\0${toStatus}`;
  const segmentByKey = new Map(
    statusSegments.map((s) => [segmentKey(s.changedAt, s.toStatus), s]),
  );

  const timeline: TaskJourneyTimelineEntry[] = [];

  for (const event of getFullIssueEventsSorted(issue)) {
    if (event.eventType === 'Status') {
      const seg = segmentByKey.get(
        segmentKey(event.changedAt, event.toValue?.trim() || '—'),
      );
      timeline.push(
        seg ?? {
          kind: 'status_transition',
          fromStatus: event.fromValue?.trim() || '—',
          toStatus: event.toValue?.trim() || '—',
          changedAt: event.changedAt,
          changedBy: event.changedBy,
          durationSincePreviousStatusMs: event.timeSincePreviousStatusMs,
          canonicalFromStage: canonicalStageLabel(issue, event.fromValue),
          canonicalToStage: canonicalStageLabel(issue, event.toValue),
          isBackflow: event.isBackflow,
          excludeFromEfficiencyBackflow: event.excludeFromEfficiencyBackflow,
          isCurrent: false,
          stageDurationMs: event.timeSincePreviousStatusMs,
          stageLabel: event.toValue?.trim() || '—',
        },
      );
      continue;
    }

    timeline.push({
      kind: 'assignee_change',
      fromAssignee: event.fromValue?.trim() || 'Unassigned',
      toAssignee: event.toValue?.trim() || 'Unassigned',
      changedAt: event.changedAt,
      changedBy: event.changedBy,
      isHandoff: event.isHandoff,
      isReturnToTeam: event.isReturnToTeam,
    });
  }

  return timeline;
}

function buildProblemBlock(
  issue: AuditIssue,
  params: ReportParams,
  now: Date,
  rules: OperationalRules,
  extraReasonSuffix?: string,
): TaskJourneyProblem {
  const thresholds = taskHealthThresholdsFromRules(rules);
  const health = classifyTaskHealth({ issue, params, now, thresholds });
  const attention = classifyIssueAttention(issue, params, now, rules);
  const workflowStage = resolveWorkflowStage(
    resolveWorkflowProfile(issue),
    issue.currentStatus || '',
  );

  let primaryReason = attention?.reason || health.reasons[0] || 'No attention signal';
  let severity = attention?.severity ?? null;
  const reasons = [...health.reasons];

  if (extraReasonSuffix && !primaryReason.includes(extraReasonSuffix)) {
    primaryReason = `${primaryReason}; ${extraReasonSuffix}`;
  }

  const currentStageAgeMs = getCurrentStageAgeMs(issue, now);
  const currentStageAgeLabel = formatStageAgeLabel(issue, now);
  const lastActivityAt = health.lastActivityAt;
  const lastActivityLabel = lastActivityAt ? formatShortDate(lastActivityAt) : null;

  const detailLines: string[] = [];
  if (workflowStage.countsAsAttentionEligible && currentStageAgeLabel !== '—') {
    detailLines.push(`Current stage: ${issue.currentStatus || '—'} · ${currentStageAgeLabel}`);
  }
  if (params.targetReviewDays) {
    detailLines.push(`Target: ${params.targetReviewDays} days`);
  }
  if (health.backflowCount > 0) {
    detailLines.push(`Backflows: ${health.backflowCount}`);
  }
  if (lastActivityLabel) {
    detailLines.push(`Last activity: ${lastActivityLabel}`);
  }

  const headline = attention
    ? primaryReason
    : health.status === 'stable'
      ? 'Not currently flagged for attention'
      : primaryReason;

  return {
    healthStatus: health.status,
    severity,
    primaryReason,
    reasons,
    headline,
    detailLines,
    currentStageAgeMs,
    currentStageAgeLabel,
    lastActivityAt,
    lastActivityLabel,
    backflowCount: health.backflowCount,
    targetReviewDays: params.targetReviewDays,
    isAttentionEligible: workflowStage.countsAsAttentionEligible,
  };
}

export function formatSegmentDurationLabel(ms: number | null): string {
  if (ms === null) return '';
  const compact = formatDuration(ms);
  return compact || workingDaysLabelFromMs(ms);
}

export interface BuildTaskJourneyInput {
  issue: AuditIssue;
  params: ReportParams;
  now?: Date;
  rules?: OperationalRules;
  persons?: Person[];
  dependencyBlockerKey?: string;
  changelogUnavailable?: boolean;
}

export function buildTaskJourney(input: BuildTaskJourneyInput): TaskJourney {
  const now = input.now ?? new Date();
  const rules = input.rules ?? DEFAULT_OPERATIONAL_RULES;
  const issue = input.issue;
  const currentStatus = issue.currentStatus?.trim() || '—';
  const currentCanonicalStage = canonicalStageLabel(issue, currentStatus);
  const currentOwner = resolveIssueCurrentOwner(issue, input.persons);

  const hasEvents = (issue.events?.length ?? 0) > 0;
  const historyComplete = hasEvents;
  let historyNotice: string | null = null;
  if (input.changelogUnavailable) {
    historyNotice = 'Full task history is unavailable for this issue.';
  } else if (!hasEvents && currentStatus !== '—') {
    historyNotice = 'History incomplete';
  }

  const extraReason = input.dependencyBlockerKey
    ? `Blocked by ${input.dependencyBlockerKey}`
    : undefined;

  const statusSegments = buildStatusSegments(issue, now);
  const timeline = buildMergedTimeline(issue, statusSegments);

  return {
    issueKey: issue.issueKey,
    title: issue.issueSummary,
    currentStatus,
    currentCanonicalStage,
    currentOwner,
    compressedPath: compressStatusPath(issue),
    historyComplete,
    historyNotice,
    problem: buildProblemBlock(issue, input.params, now, rules, extraReason),
    timeline,
    statusSegments,
  };
}

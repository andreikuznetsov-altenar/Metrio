import { appNow } from '../../../platform/appClock';
import { getBusinessDurationMs } from '../../jira/dates';
import type { AuditIssue } from '../../jira/types';
import { resolveAssigneeEffortMode } from '../../workflows/assigneeEffort';
import { resolveWorkflowProfile } from '../../workflows/resolveWorkflowProfile';
import { canonicalStageForStatus, resolveWorkflowStage } from '../../workflows/resolveWorkflowStage';
import type { AssigneeEffortMode, WorkflowProfileMapping } from '../../workflows/types';
import { HOURS_PER_WORKING_DAY } from './horizon';
import type {
  EffortHistory,
  ExecutionSample,
  ReserveVisitSample,
  StartWaitSample,
} from './types';

interface Segment {
  status: string;
  canonical: string;
  mode: AssigneeEffortMode;
  startMs: number;
  endMs: number;
}

function ms(value: string | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Business (Mon-Fri 09-17 local) hours between two instants. */
export function businessHoursBetween(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 0;
  const duration = getBusinessDurationMs(
    new Date(startMs).toISOString(),
    new Date(endMs).toISOString(),
  );
  return Math.max(0, duration ?? 0) / 3_600_000;
}

/** The issue's status timeline: one segment per stay in a status, ending at `throughMs`. */
export function statusTimeline(
  issue: AuditIssue,
  mappings: WorkflowProfileMapping[] | undefined,
  throughMs: number,
): Segment[] {
  const profile = resolveWorkflowProfile(issue, { mappings });
  const events = (issue.events || [])
    .filter((e) => e.eventType === 'Status' && ms(e.changedAt) !== null)
    .slice()
    .sort((a, b) => ms(a.changedAt)! - ms(b.changedAt)!);
  const createdMs = ms(issue.issueCreated) ?? ms(events[0]?.changedAt) ?? throughMs;
  const make = (status: string, startMs: number, endMs: number): Segment => ({
    status,
    canonical: canonicalStageForStatus(profile, status),
    mode: resolveAssigneeEffortMode(profile, status),
    startMs,
    endMs,
  });
  if (events.length === 0) {
    return createdMs < throughMs ? [make(issue.currentStatus || '', createdMs, throughMs)] : [];
  }
  const segments: Segment[] = [];
  const firstAt = ms(events[0]!.changedAt)!;
  if (firstAt > createdMs) segments.push(make(events[0]!.fromValue || '', createdMs, firstAt));
  events.forEach((event, i) => {
    const start = ms(event.changedAt)!;
    const end = i + 1 < events.length ? ms(events[i + 1]!.changedAt)! : throughMs;
    if (end > start) segments.push(make(event.toValue || '', start, Math.min(end, throughMs)));
  });
  return segments.filter((s) => s.endMs > s.startMs);
}

/** Hands-on business hours an issue has spent so far (all hands_on segments). */
export function elapsedHandsOnHours(
  issue: AuditIssue,
  mappings: WorkflowProfileMapping[] | undefined,
  nowMs: number,
): number {
  return statusTimeline(issue, mappings, nowMs)
    .filter((s) => s.mode === 'hands_on')
    .reduce((sum, s) => sum + businessHoursBetween(s.startMs, s.endMs), 0);
}

export function issueTypeKey(issue: AuditIssue): string {
  return (issue.issueTypeName || 'none').trim().toLowerCase();
}

/**
 * Mines completed/in-flight issues for the three things the effort model needs: how long
 * hands-on execution takes, how often review/QA sends work back (and the rework that follows),
 * and how long queued work waits before it starts. Pure; pass every issue you have for the team.
 */
export function buildEffortHistory(
  issues: AuditIssue[],
  options: { mappings?: WorkflowProfileMapping[]; now?: Date } = {},
): EffortHistory {
  const nowMs = (options.now ?? appNow()).getTime();
  const execution: ExecutionSample[] = [];
  const reserveVisits: ReserveVisitSample[] = [];
  const startWaits: StartWaitSample[] = [];
  const seen = new Set<string>();

  for (const issue of issues) {
    if (seen.has(issue.issueKey)) continue;
    seen.add(issue.issueKey);
    const profile = resolveWorkflowProfile(issue, { mappings: options.mappings });
    const segments = statusTimeline(issue, options.mappings, nowMs);
    if (segments.length === 0) continue;
    const base = {
      issueKey: issue.issueKey,
      ownerKey: issue.currentAssigneeCanonical ?? null,
      teamKey: (issue.projectKey || 'none').trim().toLowerCase(),
      profileId: profile.id,
      issueType: issueTypeKey(issue),
    };

    const currentStage = resolveWorkflowStage(profile, issue.currentStatus || '');
    const completed =
      currentStage.isCompletion || (currentStage.isTerminal && currentStage.canonicalStage === 'done');
    const handsOnHours = segments
      .filter((s) => s.mode === 'hands_on')
      .reduce((sum, s) => sum + businessHoursBetween(s.startMs, s.endMs), 0);
    if (completed && handsOnHours >= 0.25) execution.push({ ...base, handsOnHours });

    segments.forEach((segment, i) => {
      const isReview = segment.canonical === 'review' && segment.mode === 'reserve';
      const isQa = segment.canonical === 'qa';
      if (!isReview && !isQa) return;
      const next = segments[i + 1];
      if (!next) return; // still open: right-censored, no outcome yet
      const returned = next.mode === 'hands_on';
      let reworkHours: number | null = null;
      if (returned) {
        let j = i + 1;
        let hours = 0;
        while (j < segments.length && segments[j]!.mode === 'hands_on') {
          hours += businessHoursBetween(segments[j]!.startMs, segments[j]!.endMs);
          j += 1;
        }
        // A rework that is still running has no final duration yet.
        reworkHours = j < segments.length || completed ? hours : null;
      }
      reserveVisits.push({ ...base, kind: isReview ? 'review' : 'qa', returned, reworkHours });
    });

    const queuedAt = segments.find((s) => s.mode === 'queued');
    const firstHandsOn = segments.find((s) => s.mode === 'hands_on');
    if (queuedAt) {
      if (firstHandsOn && firstHandsOn.startMs >= queuedAt.startMs) {
        startWaits.push({
          ...base,
          started: true,
          waitDays: businessHoursBetween(queuedAt.startMs, firstHandsOn.startMs) / HOURS_PER_WORKING_DAY,
        });
      } else if (!firstHandsOn && segments[segments.length - 1]!.mode === 'queued') {
        startWaits.push({
          ...base,
          started: false,
          waitDays: businessHoursBetween(queuedAt.startMs, nowMs) / HOURS_PER_WORKING_DAY,
        });
      }
    }
  }

  return { execution, reserveVisits, startWaits };
}

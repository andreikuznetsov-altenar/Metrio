import { afterAll, describe, expect, it } from 'vitest';
import { buildMyWeek } from './myWeek';
import { getCurrentWeekRange } from '../periods/dateRange';
import { buildKpiFromIssues } from '../jira/kpi';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import type { Person } from '../people/types';
import { testWorkload } from '../testFixtures';

/**
 * "My week" shows a person's OWN completed work and backflows (the same words and numbers as the
 * KPI cards), so it must use the KPI's canonical owner attribution and eligible issue population.
 */
const VAL = 'valeriia.pavlova@altenar.com';
const ANDREI = 'andrei.kuznetsov@altenar.com';
const DARIA = 'daria.chernova@altenar.com';
const NOW = new Date('2026-10-22T14:00:00Z'); // Thursday; the week started Mon 19 Oct (Malta)
const weekParams: ReportParams = {
  dateFrom: '2026-10-19', dateTo: '2026-10-25', targetReviewDays: 3, users: [], projects: [],
};

function status(changedAt: string, fromValue: string, toValue: string): IssueEvent {
  return {
    eventType: 'Status', changedAt, changedBy: 'x', fromValue, toValue,
    timeSincePreviousStatusMs: null, isBackflow: false, isHandoff: false,
    isReturnToTeam: false, excludeFromBackflow: false,
  };
}

/**
 * Executed by `owner` Mon-Wed with one review return on Tuesday, done Wed 21 Oct. When `assignee`
 * differs, the issue was handed over after completion.
 */
function issue(key: string, owner: string, type = 'Task', assignee = owner): AuditIssue {
  const handover: IssueEvent[] = assignee === owner ? [] : [{
    eventType: 'Assignee', changedAt: '2026-10-21T18:00:00Z', changedBy: 'x', fromValue: owner,
    toValue: assignee, fromCanonical: owner, toCanonical: assignee, timeSincePreviousStatusMs: null,
    isBackflow: false, isHandoff: false, isReturnToTeam: false, excludeFromBackflow: false,
  }];
  return {
    issueKey: key, issueSummary: key, issueCreated: '2026-10-01', assigneeName: assignee,
    currentAssigneeCanonical: assignee, issueTypeName: type,
    contentType: '', designImprovementType: '', epicKey: '', epicSummary: '', epicStatus: '',
    epicContentType: '', epicDesignImprovementType: '', currentStatus: 'Done', rangeEvents: [],
    events: [
      ...handover,
      status('2026-10-19T09:00:00Z', 'To Do', 'In Progress'),
      status('2026-10-19T13:00:00Z', 'In Progress', 'Review'),
      status('2026-10-20T09:00:00Z', 'Review', 'In Progress'),
      status('2026-10-20T13:00:00Z', 'In Progress', 'Review'),
      status('2026-10-21T12:00:00Z', 'Review', 'Done'),
    ],
  } as AuditIssue;
}

function person(id: string, canonical: string, issues: AuditIssue[]): Person {
  return {
    id,
    bamboo: { id, displayName: id, firstName: id, lastName: '', workEmail: canonical, jobTitle: '', status: 'Active' },
    jira: { accountId: id, displayName: id, email: canonical, canonicalKey: canonical },
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    workload: testWorkload({ level: 'normal' }),
    performance: null,
    issues,
  } as unknown as Person;
}

describe('My week uses canonical cycle attribution', () => {
  const own = issue('UX-1', VAL);
  const andreisCycleNowHeldByVal = issue('UX-2962', ANDREI, 'Task', VAL);
  const dariasCycleNowHeldByVal = issue('UX-5719', DARIA, 'Task', VAL);
  const epic = issue('UX-99', VAL, 'Epic');
  const shared = [own, andreisCycleNowHeldByVal, dariasCycleNowHeldByVal, epic];
  const week = (p: Person) => buildMyWeek(p, weekParams, NOW);

  it('keeps a reassigned issue\'s cycle with its canonical owner', () => {
    const val = week(person('val', VAL, shared));
    expect(val.completedThisWeek.map((i) => i.issueKey)).toEqual(['UX-1']);
    const andrei = week(person('andrei', ANDREI, shared));
    expect(andrei.completedThisWeek.map((i) => i.issueKey)).toEqual(['UX-2962']);
  });

  it('excludes issue types the KPI excludes from completed work and backflows', () => {
    const onlyEpic = week(person('val', VAL, [epic]));
    expect(onlyEpic.completedThisWeek).toEqual([]);
    expect(onlyEpic.summary.completedThisWeek).toBe(0);
    expect(onlyEpic.summary.backflowsThisWeek).toBe(0);
    expect(week(person('val', VAL, [own, epic])).summary.completedThisWeek).toBe(1);
  });

  it('never shows one cycle under two people', () => {
    const people = [person('val', VAL, shared), person('andrei', ANDREI, shared), person('daria', DARIA, shared)];
    const keys = people.flatMap((p) => week(p).completedThisWeek.map((i) => i.issueKey));
    expect(keys.sort()).toEqual(['UX-1', 'UX-2962', 'UX-5719']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('reconciles completed and backflow counts with the canonical scoped KPI for the same week', () => {
    for (const [id, canonical] of [['val', VAL], ['andrei', ANDREI], ['daria', DARIA]] as const) {
      const p = person(id, canonical, shared);
      const kpi = buildKpiFromIssues(p.issues, {}, weekParams, { contributorCanonical: canonical });
      const summary = week(p).summary;
      expect(summary.completedThisWeek, `${id} completed`).toBe(kpi.completedCount);
      expect(summary.backflowsThisWeek, `${id} backflows`).toBe(kpi.backflowEventCount);
    }
    expect(week(person('val', VAL, shared)).summary).toMatchObject({ completedThisWeek: 1, backflowsThisWeek: 1 });
  });

  it('keeps the date-range semantics: work completed before this week does not count', () => {
    const later = new Date('2026-10-27T14:00:00Z'); // the next week
    expect(buildMyWeek(person('val', VAL, shared), weekParams, later).completedThisWeek).toEqual([]);
  });

  describe('an issue completed twice in the same week', () => {
    const reopened = {
      ...issue('UX-7', VAL),
      events: [
        status('2026-10-19T09:00:00Z', 'To Do', 'In Progress'),
        status('2026-10-19T13:00:00Z', 'In Progress', 'Review'),
        status('2026-10-20T12:00:00Z', 'Review', 'Done'),
        status('2026-10-20T14:00:00Z', 'Done', 'To Do'),
        status('2026-10-21T09:00:00Z', 'To Do', 'In Progress'),
        status('2026-10-21T13:00:00Z', 'In Progress', 'Review'),
        status('2026-10-22T09:00:00Z', 'Review', 'Done'),
      ],
    } as AuditIssue;

    it('counts both completions like the KPI and lists the issue once with its cycle count', () => {
      const p = person('val', VAL, [own, reopened]);
      const kpi = buildKpiFromIssues(p.issues, {}, weekParams, { contributorCanonical: VAL });
      expect(kpi.completedCount).toBe(3);
      const w = week(p);
      expect(w.summary.completedThisWeek).toBe(kpi.completedCount);
      expect(w.completedThisWeek.map((i) => i.issueKey).sort()).toEqual(['UX-1', 'UX-7']);
      expect(w.completedCycleCounts).toEqual({ 'UX-1': 1, 'UX-7': 2 });
    });

    it('does not duplicate the cycles across people and keeps backflows event-based', () => {
      const people = [person('val', VAL, [own, reopened]), person('andrei', ANDREI, [own, reopened])];
      expect(week(people[1]).summary.completedThisWeek).toBe(0);
      expect(week(people[1]).completedThisWeek).toEqual([]);
      const val = week(people[0]);
      const kpi = buildKpiFromIssues(people[0].issues, {}, weekParams, { contributorCanonical: VAL });
      // UX-1 has one review return; UX-7 has none: backflows are events, not cycles or issues.
      expect(val.summary.backflowsThisWeek).toBe(kpi.backflowEventCount);
      expect(val.summary.backflowsThisWeek).toBe(1);
      expect(val.summary.completedThisWeek).toBe(3);
    });
  });
});

describe('My week boundary follows the Europe/Malta Monday, not the host zone', () => {
  const originalTz = process.env.TZ;
  const hostZones = ['UTC', 'Europe/Malta', 'America/New_York'];
  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });
  // Monday 12 Oct 2026 00:00 in Malta (CEST, UTC+2) is Sunday 22:00Z: only an instant representation.
  const MONDAY_START = '2026-10-11T22:00:00.000Z';
  const doneAt = (iso: string) =>
    ({
      ...issue('UX-8', VAL),
      events: [
        status('2026-10-09T09:00:00Z', 'To Do', 'In Progress'),
        status('2026-10-09T13:00:00Z', 'In Progress', 'Review'),
        status(iso, 'Review', 'Done'),
      ],
    }) as AuditIssue;
  const countAt = (completedIso: string, nowIso: string) =>
    buildMyWeek(person('val', VAL, [doneAt(completedIso)]), weekParams, new Date(nowIso)).summary.completedThisWeek;

  it('starts the canonical week on Monday 2026-10-12 local time (22:00Z the evening before)', () => {
    for (const tz of hostZones) {
      process.env.TZ = tz;
      for (const nowIso of ['2026-10-11T22:30:00Z', '2026-10-12T00:30:00Z', '2026-10-14T12:00:00Z']) {
        expect(getCurrentWeekRange(new Date(nowIso)).start.toISOString(), `${nowIso} under ${tz}`).toBe(MONDAY_START);
      }
      // Sunday evening in Malta still belongs to the previous week.
      expect(getCurrentWeekRange(new Date('2026-10-11T21:30:00Z')).start.toISOString(), tz).toBe('2026-10-04T22:00:00.000Z');
    }
  });

  it('filters completions by that instant: Sunday 23:59 Malta is last week, Monday 00:01 is this week', () => {
    for (const tz of hostZones) {
      process.env.TZ = tz;
      const now = '2026-10-14T12:00:00Z';
      expect(countAt('2026-10-11T21:59:00Z', now), `before Monday under ${tz}`).toBe(0);
      expect(countAt('2026-10-11T22:01:00Z', now), `after Monday under ${tz}`).toBe(1);
    }
  });
});

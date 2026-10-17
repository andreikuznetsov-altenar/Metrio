import { describe, expect, it } from 'vitest';
import { buildWorkHistory } from './workHistory';
import { buildKpiFromIssues } from '../jira/kpi';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import type { Person } from '../people/types';
import { testWorkload } from '../testFixtures';

const params: ReportParams = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-31',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

const VAL = 'valeriia.pavlova@altenar.com';
const ANDREI = 'andrei.kuznetsov@altenar.com';
const DARIA = 'daria.chernova@altenar.com';

function status(changedAt: string, fromValue: string, toValue: string): IssueEvent {
  return {
    eventType: 'Status', changedAt, changedBy: 'x', fromValue, toValue,
    timeSincePreviousStatusMs: null, isBackflow: false, isHandoff: false,
    isReturnToTeam: false, excludeFromBackflow: false,
  };
}

/** A completed cycle (Mon 5 Oct → Wed 7 Oct 2026) executed by `owner`, assigned to `assignee` today. */
function completedIssue(key: string, owner: string, doneDay = '07', assignee = owner): AuditIssue {
  return {
    issueKey: key,
    issueSummary: `Task ${key}`,
    issueCreated: '2026-09-20',
    assigneeName: assignee,
    currentAssigneeCanonical: assignee,
    issueTypeName: 'Task',
    contentType: '', designImprovementType: '', epicKey: '', epicSummary: '', epicStatus: '',
    epicContentType: '', epicDesignImprovementType: '',
    currentStatus: 'Done',
    rangeEvents: [],
    events: [
      // The cycle is executed while the issue is assigned to `owner`: assignee events record the
      // hand-over to the current assignee after completion.
      ...(assignee === owner ? [] : [{
        eventType: 'Assignee' as const, changedAt: `2026-10-${doneDay}T18:00:00Z`, changedBy: 'x',
        fromValue: owner, toValue: assignee, fromCanonical: owner, toCanonical: assignee,
        timeSincePreviousStatusMs: null, isBackflow: false, isHandoff: false,
        isReturnToTeam: false, excludeFromBackflow: false,
      }]),
      status('2026-10-05T09:00:00Z', 'To Do', 'In Progress'),
      status('2026-10-06T09:00:00Z', 'In Progress', 'Review'),
      status(`2026-10-${doneDay}T12:00:00Z`, 'Review', 'Done'),
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

describe('person Work History uses canonical completed-cycle attribution', () => {
  // Valeriia's issue set contains work she touched or now holds but did not own the cycle of.
  const own1 = completedIssue('UX-1', VAL, '07');
  const own2 = completedIssue('UX-2', VAL, '08');
  const andreiCycleNowHeldByVal = completedIssue('UX-2962', ANDREI, '07', VAL);
  const dariaCycleTouchedByVal = completedIssue('UX-5719', DARIA, '07', VAL);
  const valeriiaIssues = [own1, own2, andreiCycleNowHeldByVal, dariaCycleTouchedByVal];
  const entries = (p: Person) => buildWorkHistory(p, params, 'month').flatMap((g) => g.entries);

  it('lists a cycle owned by Valeriia and omits cycles owned by Andrei or Daria', () => {
    const keys = entries(person('val', VAL, valeriiaIssues)).map((e) => e.issueKey).sort();
    expect(keys).toEqual(['UX-1', 'UX-2']);
  });

  it('lists the cycle under its owner even when the issue is now assigned to someone else', () => {
    const andrei = person('andrei', ANDREI, [andreiCycleNowHeldByVal]);
    expect(entries(andrei).map((e) => e.issueKey)).toEqual(['UX-2962']);
  });

  it('never lists one cycle in two people\'s completed histories', () => {
    const shared = [own1, own2, andreiCycleNowHeldByVal, dariaCycleTouchedByVal];
    const people = [person('val', VAL, shared), person('andrei', ANDREI, shared), person('daria', DARIA, shared)];
    const keys = people.flatMap((p) => entries(p).map((e) => e.cycleKey));
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(4);
  });

  it('reconciles History completed counts with the person KPI for the same period', () => {
    for (const [id, canonical] of [['val', VAL], ['andrei', ANDREI], ['daria', DARIA]] as const) {
      const p = person(id, canonical, valeriiaIssues);
      const kpi = buildKpiFromIssues(p.issues, {}, params, { contributorCanonical: canonical });
      const groups = buildWorkHistory(p, params, 'month');
      const completed = groups.reduce((sum, g) => sum + g.completedCount, 0);
      const firstPass = groups.reduce((sum, g) => sum + g.firstPassCount, 0);
      expect(completed, `${id} completed`).toBe(kpi.completedCount);
      expect(firstPass, `${id} first pass`).toBe(kpi.firstPassAcceptedCount);
      expect(groups.reduce((sum, g) => sum + g.reviewReturns, 0)).toBe(kpi.reworkedCycleCount);
    }
  });

  it('groups by the canonical completion date and keeps issue details', () => {
    const [group] = buildWorkHistory(person('val', VAL, valeriiaIssues), params, 'month');
    expect(group.label).toBe('2026-10');
    expect(group.completedCount).toBe(2);
    const first = group.entries.find((e) => e.issueKey === 'UX-2')!;
    expect(first.completedAt).toBe('2026-10-08T12:00:00Z');
    expect(first.summary).toBe('Task UX-2');
    expect(first.project).toBe('UX');
    expect(first.issue.issueKey).toBe('UX-2');
    expect(first.cycleMs).toBeGreaterThan(0);
  });

  it('excludes cycles completed outside the requested period', () => {
    const november = { ...params, dateFrom: '2026-11-01', dateTo: '2026-11-30' };
    expect(buildWorkHistory(person('val', VAL, valeriiaIssues), november, 'month')).toEqual([]);
  });
});

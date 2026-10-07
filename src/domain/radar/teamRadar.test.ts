import { describe, expect, it } from 'vitest';
import { buildTeamRadar } from './teamRadar';
import type { Person, TeamSnapshot } from '../people/types';
import type { ReportParams } from '../jira/types';
import { testWorkload } from '../testFixtures';
import { filterOwnedIssues } from '../people/ownedIssues';

const params: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-03-01',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function person(overrides: Partial<Person> & { id: string; name: string }): Person {
  return {
    id: overrides.id,
    bamboo: {
      id: overrides.id,
      displayName: overrides.name,
      firstName: overrides.name,
      lastName: '',
      workEmail: `${overrides.id}@co.com`,
      jobTitle: 'Designer',
      status: 'Active',
    },
    jira: {
      accountId: overrides.id,
      displayName: overrides.name,
      email: `${overrides.id}@co.com`,
      canonicalKey: overrides.id,
    },
    identity: { matchedBy: 'email', warnings: [] },
    availability: overrides.availability || { state: 'available', label: 'Available', isHoliday: false },
    workload: overrides.workload || testWorkload({ level: 'normal', activeCount: 2 }),
    performance: overrides.performance || null,
    issues: overrides.issues || [],
    ownedIssues:
      overrides.ownedIssues ??
      filterOwnedIssues(overrides.issues || [], overrides.id),
  };
}

const teamSnapshot = (persons: Person[]): TeamSnapshot => ({
  persons,
  mode: 'team',
  summary: {
    available: persons.length,
    onVacation: 0,
    vacationSoon: 0,
    highWorkload: 0,
    problematic: 0,
  },
});

describe('buildTeamRadar', () => {
  it('flags overloaded person as critical', () => {
    const items = buildTeamRadar(
      teamSnapshot([
        person({
          id: '1',
          name: 'Anna',
          workload: testWorkload({
            level: 'overloaded',
            activeCount: 9,
            atRiskCount: 2,
            problematicCount: 1,
          }),
        }),
      ]),
      params,
    );
    expect(items).toHaveLength(1);
    expect(items[0].severity).toBe('critical');
  });

  it('returns empty when team is healthy', () => {
    const items = buildTeamRadar(
      teamSnapshot([person({ id: '1', name: 'Healthy' })]),
      params,
    );
    expect(items).toHaveLength(0);
  });

  it('orders critical before warning', () => {
    const items = buildTeamRadar(
      teamSnapshot([
        person({
          id: '1',
          name: 'Warn',
          workload: testWorkload({ level: 'high', activeCount: 6 }),
        }),
        person({
          id: '2',
          name: 'Crit',
          workload: testWorkload({ level: 'overloaded', activeCount: 10, atRiskCount: 1 }),
        }),
      ]),
      params,
    );
    expect(items[0].personName).toBe('Crit');
  });

  it('does not duplicate signals for same issue', () => {
    const items = buildTeamRadar(
      teamSnapshot([
        person({
          id: '1',
          name: 'Anna',
          issues: [
            {
              issueKey: 'PROJ-1',
              issueSummary: 'Task',
              issueCreated: '2026-01-01',
              assigneeName: 'Anna',
              issueTypeName: 'Task',
              contentType: '',
              designImprovementType: '',
              epicKey: '',
              epicSummary: '',
              epicStatus: '',
              epicContentType: '',
              epicDesignImprovementType: '',
              events: [],
              rangeEvents: [],
              currentStatus: 'Hold',
              currentAssigneeCanonical: '1',
            },
          ],
        }),
      ]),
      params,
    );
    const issueSignals = items[0].signals.filter((s) => s.issueKey === 'PROJ-1');
    expect(issueSignals.length).toBeLessThanOrEqual(2);
  });
});

import { describe, expect, it } from 'vitest';
import { buildCurrentUserFromTeamDetection } from './fromTeamDetection';
import type { OrgResolutionResult } from '../../services/bamboo/orgResolver';

const employee = {
  id: '10',
  displayName: 'Alex Morgan',
  firstName: 'Alex',
  lastName: 'Morgan',
  workEmail: 'alex@altenar.com',
  jobTitle: 'Designer',
  status: 'active',
};

describe('buildCurrentUserFromTeamDetection', () => {
  it('returns employee role without team when no direct reports', () => {
    const team: OrgResolutionResult = {
      ok: true,
      mode: 'personal',
      employee,
      directReports: [],
      fullTeam: [employee],
      missingFields: [],
      restrictedFields: [],
      diagnostics: [],
      reportingSource: 'id',
      ambiguousSupervisorNames: 0,
    };
    const user = buildCurrentUserFromTeamDetection(team);
    expect(user?.person.role).toBe('employee');
    expect(user?.team).toBeUndefined();
  });

  it('returns lead with direct reports only', () => {
    const report = { ...employee, id: '11', displayName: 'Report One', jobTitle: 'IC' };
    const team: OrgResolutionResult = {
      ok: true,
      mode: 'team',
      employee: { ...employee, jobTitle: 'Team Lead' },
      directReports: [report],
      fullTeam: [employee, report],
      missingFields: [],
      restrictedFields: [],
      diagnostics: [],
      reportingSource: 'id',
      ambiguousSupervisorNames: 0,
    };
    const user = buildCurrentUserFromTeamDetection(team);
    expect(user?.person.role).toBe('lead');
    expect(user?.team?.directReportIds).toEqual(['11']);
  });

  it('returns director when job title matches', () => {
    const report = { ...employee, id: '12', displayName: 'Report Two' };
    const team: OrgResolutionResult = {
      ok: true,
      mode: 'team',
      employee: { ...employee, jobTitle: 'Engineering Director' },
      directReports: [report],
      fullTeam: [employee, report],
      missingFields: [],
      restrictedFields: [],
      diagnostics: [],
      reportingSource: 'id',
      ambiguousSupervisorNames: 0,
    };
    const user = buildCurrentUserFromTeamDetection(team);
    expect(user?.person.role).toBe('director');
  });
});

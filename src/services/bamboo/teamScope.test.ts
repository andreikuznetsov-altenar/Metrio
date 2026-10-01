import { describe, expect, it } from 'vitest';
import type { OrgResolutionResult, ResolvedEmployee } from './orgResolver';
import {
  findIndirectReportsExcludedFromScope,
  isPersonInTeamScope,
  resolveTeamScope,
} from './teamScope';

function employee(id: string, name: string): ResolvedEmployee {
  return {
    id,
    displayName: name,
    firstName: name,
    lastName: 'Test',
    workEmail: `${id}@co.com`,
    jobTitle: 'IC',
    status: 'Active',
  };
}

function orgResult(partial: Partial<OrgResolutionResult> & { employee: ResolvedEmployee }): OrgResolutionResult {
  return {
    ok: true,
    mode: 'personal',
    directReports: [],
    fullTeam: [],
    missingFields: [],
    restrictedFields: [],
    diagnostics: [],
    reportingSource: 'id',
    ambiguousSupervisorNames: 0,
    ...partial,
  };
}

describe('resolveTeamScope (non-recursive role rule)', () => {
  it('employee mode includes only self', () => {
    const self = employee('1', 'Alice');
    const scope = resolveTeamScope(
      orgResult({ mode: 'personal', employee: self, directReports: [], fullTeam: [] }),
    );

    expect(scope?.mode).toBe('employee');
    expect(scope?.members.map((m) => m.id)).toEqual(['1']);
  });

  it('manager mode includes self and immediate direct reports only', () => {
    const self = employee('1', 'Alice Manager');
    const bob = employee('2', 'Bob');
    const carol = employee('3', 'Carol');

    const scope = resolveTeamScope(
      orgResult({
        mode: 'team',
        employee: self,
        directReports: [bob, carol],
        fullTeam: [bob, carol, employee('4', 'Deep Report')],
      }),
    );

    expect(scope?.mode).toBe('manager');
    expect(scope?.memberIds).toEqual(['1', '2', '3']);
    expect(scope?.memberIds).not.toContain('4');
  });

  it('ignores recursive fullTeam members beyond direct reports', () => {
    const self = employee('1', 'Alice Manager');
    const bob = employee('2', 'Bob');
    const deep = employee('3', 'Deep');

    const org = orgResult({
      mode: 'team',
      employee: self,
      directReports: [bob],
      fullTeam: [bob, deep],
    });

    const indirect = findIndirectReportsExcludedFromScope(org);
    expect(indirect.map((p) => p.id)).toEqual(['3']);
    expect(isPersonInTeamScope(org, '3')).toBe(false);
    expect(isPersonInTeamScope(org, '2')).toBe(true);
  });

  it('returns null when org resolution failed', () => {
    expect(
      resolveTeamScope({
        ok: false,
        mode: 'unknown',
        directReports: [],
        fullTeam: [],
        missingFields: [],
        restrictedFields: [],
        diagnostics: [],
        reportingSource: 'unknown',
        ambiguousSupervisorNames: 0,
        error: 'nope',
      }),
    ).toBeNull();
  });
});

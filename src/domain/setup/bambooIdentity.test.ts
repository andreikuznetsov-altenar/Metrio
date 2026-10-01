import { describe, expect, it } from 'vitest';
import {
  buildPersonalLimitedResult,
  isEmployeeNotFound,
  isReportingRestricted,
} from './bambooIdentity';
import type { OrgResolutionResult } from '../../services/bamboo/orgResolver';

const employee = {
  id: '1',
  displayName: 'Anna Smith',
  firstName: 'Anna',
  lastName: 'Smith',
  workEmail: 'anna@altenar.com',
  jobTitle: 'Designer',
  status: 'active',
};

describe('bamboo identity helpers', () => {
  it('detects employee not found', () => {
    const result: OrgResolutionResult = {
      ok: false,
      mode: 'unknown',
      directReports: [],
      fullTeam: [],
      missingFields: [],
      restrictedFields: [],
      diagnostics: [],
      reportingSource: 'unknown',
      ambiguousSupervisorNames: 0,
      error: "We connected to BambooHR, but couldn't find an employee with: anna@altenar.com",
    };
    expect(isEmployeeNotFound(result)).toBe(true);
  });

  it('detects reporting restriction', () => {
    const result: OrgResolutionResult = {
      ok: false,
      mode: 'unknown',
      employee,
      directReports: [],
      fullTeam: [],
      missingFields: [],
      restrictedFields: ['supervisorEId'],
      diagnostics: [],
      reportingSource: 'unknown',
      ambiguousSupervisorNames: 0,
      error: 'Cannot determine reporting structure — supervisor fields are missing or restricted.',
    };
    expect(isReportingRestricted(result)).toBe(true);
  });

  it('builds personal_limited mode', () => {
    const partial: OrgResolutionResult = {
      ok: false,
      mode: 'unknown',
      employee,
      directReports: [],
      fullTeam: [],
      missingFields: [],
      restrictedFields: ['supervisorEId'],
      diagnostics: [],
      reportingSource: 'unknown',
      ambiguousSupervisorNames: 0,
      error: 'restricted',
    };
    const result = buildPersonalLimitedResult(partial);
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('personal_limited');
  });
});

import type { OrgResolutionResult } from '../../services/bamboo/orgResolver';

export function isEmployeeNotFound(result: OrgResolutionResult): boolean {
  return (
    !result.ok &&
    (result.error?.includes('No Bamboo employee found') ||
      result.error?.includes("couldn't find an employee") ||
      false)
  );
}

export function isReportingRestricted(result: OrgResolutionResult): boolean {
  return (
    !result.ok &&
    !!result.employee &&
    (result.error?.includes('reporting structure') ||
      result.error?.includes('supervisor fields') ||
      result.error?.includes('supervisor name is ambiguous') ||
      false)
  );
}

export function isDuplicateEmployeeError(result: OrgResolutionResult): boolean {
  return !result.ok && (result.error?.includes('Multiple Bamboo employees') ?? false);
}

export function buildPersonalLimitedResult(
  partial: OrgResolutionResult,
): OrgResolutionResult {
  if (!partial.employee) {
    return partial;
  }
  return {
    ok: true,
    mode: 'personal_limited',
    employee: partial.employee,
    directReports: [],
    fullTeam: [],
    missingFields: partial.missingFields,
    restrictedFields: partial.restrictedFields,
    diagnostics: [
      ...partial.diagnostics,
      'Continued with personal statistics — reporting structure unavailable.',
    ],
    reportingSource: partial.reportingSource,
    ambiguousSupervisorNames: partial.ambiguousSupervisorNames,
  };
}

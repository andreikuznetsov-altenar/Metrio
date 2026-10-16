import { addDays, format } from 'date-fns';
import type { AuditReportData } from '../../domain/jira/types';
import { classifyAvailability, pickRelevantTimeOff, type TimeOffEntry } from '../../domain/people/availability';
import { resolveJiraIdentity, toPersonJiraIdentity } from '../../domain/people/identityResolver';
import type { Person, TeamSnapshot } from '../../domain/people/types';
import type { OrgResolutionResult, ResolvedEmployee } from '../bamboo/orgResolver';
import type { TeamUser } from '../../domain/jira/types';
// TeamUser used for identity resolution
import { calculateWorkload } from '../../domain/workload/workloadEngine';
import { classifyTaskHealth } from '../../domain/task-health/taskHealthEngine';
import { filterOwnedIssues } from '../../domain/people/ownedIssues';
import type { WorkloadThresholds } from '../../domain/workload/workloadEngine';
import { buildEffortHistory } from '../../domain/workload/effort/history';
import type { LeavePeriod } from '../../domain/workload/effort/types';

import { appNow } from "../../platform/appClock";
function collectScopeEmployees(org: OrgResolutionResult): ResolvedEmployee[] {
  if (!org.employee) return [];
  if (org.mode === 'personal' || org.mode === 'personal_limited') return [org.employee];
  if (org.mode === 'team') {
    const members = org.fullTeam.length ? org.fullTeam : org.directReports;
    return [org.employee, ...members];
  }
  return [];
}

export function summarizeTeam(
  persons: Person[],
  params: AuditReportData['params'] | undefined,
): TeamSnapshot['summary'] {
  return {
    available: persons.filter((p) => p.availability.state === 'available').length,
    onVacation: persons.filter((p) => p.availability.state === 'on_vacation').length,
    vacationSoon: persons.filter(
      (p) => p.availability.state === 'vacation_soon' || p.availability.state === 'vacation_tomorrow',
    ).length,
    highWorkload: persons.filter(
      (p) =>
        p.availability.state === 'available' &&
        (p.workload?.level === 'high' || p.workload?.level === 'overloaded'),
    ).length,
    problematic: persons.reduce((sum, p) => {
      if (!params) return sum;
      return (
        sum +
        p.ownedIssues.filter(
          (i) => classifyTaskHealth({ issue: i, params }).status === 'problematic',
        ).length
      );
    }, 0),
  };
}

function leavePeriodsForEmployee(entries: TimeOffEntry[], employeeId: string): LeavePeriod[] {
  return entries
    .filter((entry) => entry.employeeId === employeeId)
    .map((entry) => ({
      start: String(entry.start || entry.startDate || '').slice(0, 10),
      end: String(entry.end || entry.endDate || '').slice(0, 10),
    }))
    .filter((period) => period.start && period.end);
}

export function buildTeamSnapshot(
  org: OrgResolutionResult,
  reportData: AuditReportData | null,
  timeOffEntries: TimeOffEntry[],
  workloadThresholds: WorkloadThresholds,
  teamUsers: TeamUser[] = [],
  vacationSoonWithinDays = 7,
): TeamSnapshot {
  const employees = collectScopeEmployees(org);

  // One team-wide history feeds every person's effort estimates (medians need the whole sample).
  const effortHistory = reportData
    ? buildEffortHistory(
        Object.values(reportData.grouped).flatMap((block) => block.issues),
        { now: appNow() },
      )
    : undefined;

  const persons: Person[] = employees.map((employee) => {
    const mapping = resolveJiraIdentity(employee, teamUsers);
    const { jira, identity } = toPersonJiraIdentity(mapping);

    const canonicalKey = jira?.canonicalKey || employee.workEmail || employee.id;
    const block = reportData?.grouped[canonicalKey];
    const issues = block?.issues || [];
    const ownedIssues = filterOwnedIssues(issues, canonicalKey);
    const params = reportData?.params;

    const timeOff = pickRelevantTimeOff(timeOffEntries, employee.id);
    const availability = classifyAvailability(timeOff, undefined, vacationSoonWithinDays);

    const performance = reportData?.perUserKpi[canonicalKey] || null;
    const leavePeriods = leavePeriodsForEmployee(timeOffEntries, employee.id);
    const personalWorkload =
      params
        ? calculateWorkload(ownedIssues, params, workloadThresholds, availability, {
            capacityIssues: issues,
            capacitySubjectCanonical: canonicalKey,
            effortHistory,
            leave: leavePeriods,
          })
        : null;

    return {
      id: employee.id,
      bamboo: employee,
      jira,
      identity,
      availability,
      leavePeriods,
      personalWorkload,
      workload: personalWorkload,
      performance,
      issues,
      ownedIssues,
    };
  });

  const summary = summarizeTeam(persons, reportData?.params);

  return { persons, mode: org.mode, summary };
}

export function getWhosOutDateRange(): { start: string; end: string } {
  const start = format(appNow(), 'yyyy-MM-dd');
  const end = format(addDays(appNow(), 30), 'yyyy-MM-dd');
  return { start, end };
}

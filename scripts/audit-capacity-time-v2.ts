/** Read-only local audit: compares cached historical load with Capacity/Time V2. */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AuditReportData } from '../src/domain/jira/types';
import type { TeamSnapshot } from '../src/domain/people/types';
import { calculateCapacityBreakdown } from '../src/domain/workflows/capacityWorkload';

const cachePath = process.env.METRIO_DASHBOARD_CACHE ?? join(
  homedir(),
  'Library/Application Support/com.altenar.metrio/dashboard_cache.json',
);

type TimeOffEntry = { employeeId: string | number; start: string; end: string };
const raw = JSON.parse(readFileSync(cachePath, 'utf8')) as {
  fetchResult: {
    reportData: AuditReportData;
    teamSnapshot: TeamSnapshot;
    timeOffEntries?: TimeOffEntry[];
  };
};

const { reportData, teamSnapshot } = raw.fetchResult;
const timeOff = raw.fetchResult.timeOffEntries ?? [];
const rows = teamSnapshot.persons.map((person) => {
  const employeeId = String(person.bamboo.id ?? person.id);
  const leave = timeOff
    .filter((entry) => String(entry.employeeId) === employeeId)
    .filter((entry) => entry.end >= reportData.params.dateFrom && entry.start <= reportData.params.dateTo)
    .map((entry) => ({ start: entry.start, end: entry.end }));
  const before = person.workload?.capacityBreakdown;
  const after = calculateCapacityBreakdown({
    issues: person.issues,
    params: reportData.params,
    subjectCanonical: person.jira?.canonicalKey,
    leave,
    now: new Date(raw.fetchResult.reportData.params.dateTo + 'T12:00:00Z'),
  });
  return {
    person: person.bamboo.displayName,
    executionBusinessHours: after.executionHoursInPeriod,
    scheduledAvailableHours: after.availableHoursInPeriod,
    availabilityAdjustedHours: after.availabilityAdjustedHours,
    completedSamples: after.completedCyclesInPeriod,
    oldFormulaPercent: before?.capacityLoadPercent ?? person.workload?.capacityLoadPercent ?? null,
    oldNormalizedMonthlyHours: before?.estimatedMonthlyHours ?? null,
    newDirectPercent: after.capacityLoadPercent,
    newNormalizedMonthlyEquivalentHours: after.estimatedMonthlyHours,
    leaveRangesApplied: leave,
  };
});

console.log(JSON.stringify({
  cachePath,
  period: { from: reportData.params.dateFrom, to: reportData.params.dateTo },
  timeZone: 'Europe/Malta',
  publicHolidaysIncluded: false,
  rows,
}, null, 2));

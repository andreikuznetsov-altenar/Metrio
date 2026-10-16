/**
 * Read-only local audit for Organization and Signals Methodology V2.
 *
 * Runs against the cached real team (dashboard cache) and prints JSON. The same script runs on
 * the pre-V2 baseline and on this branch (`npx vite-node scripts/audit-org-signals-v2.ts`), so the
 * two outputs are directly comparable. Fields that only exist after V2 are read defensively.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AuditReportData } from '../src/domain/jira/types';
import type { Person, TeamSnapshot } from '../src/domain/people/types';
import { getOperationalIssues } from '../src/domain/people/ownedIssues';
import { calculateWorkload } from '../src/domain/workload/workloadEngine';
import { classifyTaskHealth } from '../src/domain/task-health/taskHealthEngine';
import { buildDeliveryRiskItems } from '../src/domain/radar/deliveryRisk';
import { buildWorkloadBalance } from '../src/domain/workload/workloadBalance';
import { personRouteKey } from '../src/domain/people/personDisplay';
import {
  buildHistoricalTeamSnapshotsFromPersons,
  enumerateLocalDateKeys,
} from '../src/domain/history/historicalFlow';
import { addCalendarDays } from '../src/domain/calendar/workingCalendar';
import * as snapshotEngine from '../src/domain/snapshots/snapshotEngine';

const cachePath =
  process.env.METRIO_DASHBOARD_CACHE ??
  join(homedir(), 'Library/Application Support/com.altenar.metrio/dashboard_cache.json');
const snapshotPath =
  process.env.METRIO_KPI_SNAPSHOTS ??
  join(homedir(), 'Library/Application Support/com.altenar.metrio/kpi_snapshots.json');

type TimeOffEntry = { employeeId: string | number; start: string; end: string };
const raw = JSON.parse(readFileSync(cachePath, 'utf8')) as {
  fetchResult: { reportData: AuditReportData; teamSnapshot: TeamSnapshot; timeOffEntries?: TimeOffEntry[] };
};
const { reportData, teamSnapshot } = raw.fetchResult;
const timeOff = raw.fetchResult.timeOffEntries ?? [];
const params = reportData.params;
const now = new Date(`${params.dateTo}T12:00:00Z`);

const round1 = (n: number) => Math.round(n * 10) / 10;
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ---- Current state: workload + task health per person (recomputed with the code under test) ----
const persons: Person[] = teamSnapshot.persons.map((person) => {
  const employeeId = String(person.bamboo.id ?? person.id);
  const leave = timeOff
    .filter((e) => String(e.employeeId) === employeeId)
    .map((e) => ({ start: e.start, end: e.end }));
  const issues = getOperationalIssues(person);
  const workload = calculateWorkload(issues, params, undefined, person.availability, {
    now,
    capacityIssues: person.issues,
    capacitySubjectCanonical: person.jira?.canonicalKey,
    leave,
  });
  return { ...person, workload, personalWorkload: workload } as Person;
});
const snapshot: TeamSnapshot = { ...teamSnapshot, persons };

const people = persons.map((person) => {
  const w = person.workload as any;
  const open = getOperationalIssues(person)
    .map((issue) => ({ issue, health: classifyTaskHealth({ issue, params, now }) as any }))
    .filter(({ health }) => !health.isCompleted);
  const byStatus: Record<string, number> = {};
  for (const { health } of open) byStatus[health.status] = (byStatus[health.status] ?? 0) + 1;
  const backflowProblematic = open.filter(
    ({ health }) => health.status === 'problematic' && /backflow|returned|rework/i.test(health.reasons.join(' ')),
  ).length;
  const holdIssues = open.filter(({ health }) => health.stageKind === 'hold' || /hold|block/i.test(health.reasons.join(' ')));
  const breakdown: Array<{ issueKey: string; contributionHours?: number; hours?: number }> = w.effortBreakdown ?? [];
  const holdEffort = holdIssues.reduce((sum, { issue }) => {
    const row = breakdown.find((b) => b.issueKey === issue.issueKey);
    return sum + (row?.contributionHours ?? row?.hours ?? 0);
  }, 0);
  return {
    person: person.bamboo.displayName,
    expectedEffortHours: w.expectedEffortHours ?? null,
    availableHoursInHorizon: w.availableHoursInHorizon ?? null,
    currentLoadPercent: w.currentLoadPercent ?? null,
    level: w.level,
    activeCount: w.activeCount,
    openTasks: open.length,
    health: byStatus,
    problematicBecauseOfBackflow: backflowProblematic,
    openWithHistoricalBackflow: open.filter(({ health }) => health.backflowEventCount > 0).length,
    holdTasks: holdIssues.length,
    holdEffortHours: round1(holdEffort),
    historicalLoadPercent: w.capacityLoadPercent ?? null,
    capacityDataState: w.capacityDataState ?? null,
  };
});

// ---- Team workload: pooled vs mean of person percentages ----
const rows = people.filter((p) => p.currentLoadPercent !== null);
const sumExpected = rows.reduce((s, p) => s + (p.expectedEffortHours ?? 0), 0);
const sumAvailable = rows.reduce((s, p) => s + (p.availableHoursInHorizon ?? 0), 0);
const teamWorkload = {
  pooledPercent: sumAvailable > 0 ? round1((sumExpected / sumAvailable) * 100) : null,
  meanOfPersonPercents: rows.length ? round1(rows.reduce((s, p) => s + (p.currentLoadPercent ?? 0), 0) / rows.length) : null,
  sumExpectedHours: round1(sumExpected),
  sumAvailableHours: round1(sumAvailable),
};

// ---- Workload balance ordering ----
const balance = buildWorkloadBalance(snapshot, personRouteKey, {
  active: (p) => (p.workload as any)?.activeCount ?? 0,
  atRisk: (p) => (p.workload as any)?.atRiskCount ?? 0,
  problematic: (p) => (p.workload as any)?.problematicCount ?? 0,
}) as any;
const balanceOrder = (balance.rows ?? balance).map((r: any) => ({
  person: r.personName,
  currentLoadPercent: r.currentLoadPercent ?? r.score ?? null,
  activeCount: r.activeCount,
}));

// ---- Delivery Risk ----
const risk = buildDeliveryRiskItems(snapshot, params, now) as any[];
const severityCounts: Record<string, number> = {};
for (const item of risk) severityCounts[item.severity] = (severityCounts[item.severity] ?? 0) + 1;
const deliveryRisk = {
  total: risk.length,
  uniqueIssueKeys: new Set(risk.map((r) => r.issueKey)).size,
  severity: severityCounts,
  criticalWithVacationOnly: risk.filter(
    (r) => r.severity === 'critical' && /vacation/i.test(r.reason) && !/exceeds|blocked|hold|overdue|no activity|returned/i.test(r.reason),
  ).length,
  items: risk.map((r) => ({
    issueKey: r.issueKey,
    owner: r.personName,
    status: r.status,
    severity: r.severity,
    rule: r.rule ?? null,
    reason: r.reason,
  })),
};

// ---- Trends: flow primitives over the last 28 days vs previous 28 days ----
const trendDays = 28;
const dateKeys = enumerateLocalDateKeys(addCalendarDays(params.dateTo, -(trendDays * 2 - 1)), params.dateTo);
const daily = buildHistoricalTeamSnapshotsFromPersons(persons, dateKeys, params) as any[];
function window(from: number, to: number) {
  const slice = daily.slice(from, to);
  const completed = slice.reduce((s, d) => s + d.completedOnDate, 0);
  const firstPass = slice.reduce((s, d) => s + d.firstPassOnDate, 0);
  const backflows = slice.reduce((s, d) => s + d.backflowsOnDate, 0);
  const reworked = slice.reduce((s, d) => s + (d.reworkedCyclesOnDate ?? Math.max(0, d.completedOnDate - d.firstPassOnDate)), 0);
  const cycleSum = slice.reduce((s, d) => s + d.cycleMsSumOnDate, 0);
  const cycleCount = slice.reduce((s, d) => s + d.completedWithCycleOnDate, 0);
  const samples: number[] = slice.flatMap((d) => d.cycleMsSamplesOnDate ?? []);
  const sumOfDailyFirstPassPercents = slice.reduce(
    (s, d) => s + (d.completedOnDate > 0 ? (d.firstPassOnDate / d.completedOnDate) * 100 : 0),
    0,
  );
  const dayMs24 = 24 * 3_600_000;
  const dayMs8 = 8 * 3_600_000;
  return {
    completed,
    backflowEvents: backflows,
    firstPassPooledPercent: completed ? round1((firstPass / completed) * 100) : null,
    firstPassSumOfDailyPercents: round1(sumOfDailyFirstPassPercents),
    reworkRatePercent: completed ? round1((reworked / completed) * 100) : null,
    meanCycleDays_24hDivisor: cycleCount ? round1(cycleSum / cycleCount / dayMs24) : null,
    meanCycleBusinessDays_8hDivisor: cycleCount ? round1(cycleSum / cycleCount / dayMs8) : null,
    medianCycleBusinessDays: samples.length ? round1((median(samples) as number) / dayMs8) : null,
    cycleSamples: samples.length || cycleCount,
  };
}
const trends = {
  current: window(trendDays, trendDays * 2),
  previous: window(0, trendDays),
};

// ---- Persisted KPI snapshot file (real, on disk) ----
let snapshotFile: Record<string, unknown> = { present: false };
try {
  const fileRaw = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const migrated = (snapshotEngine as any).migrateKpiSnapshotFile(fileRaw);
  snapshotFile = {
    present: true,
    onDiskSchemaVersion: fileRaw.schemaVersion ?? null,
    onDiskMethodology: fileRaw.methodology ?? null,
    onDiskTeamRows: fileRaw.teamSnapshots?.length ?? 0,
    onDiskPersonRows: fileRaw.personSnapshots?.length ?? 0,
    afterLoadSchemaVersion: migrated.schemaVersion,
    afterLoadMethodology: migrated.methodology ?? null,
    afterLoadTeamRows: migrated.teamSnapshots.length,
    afterLoadPersonRows: migrated.personSnapshots.length,
  };
} catch (error) {
  snapshotFile = { present: false, error: String(error) };
}

console.log(
  JSON.stringify(
    {
      period: { from: params.dateFrom, to: params.dateTo, now: now.toISOString() },
      targetReviewDays: params.targetReviewDays,
      people,
      teamWorkload,
      balanceOrder,
      deliveryRisk,
      trends,
      snapshotFile,
    },
    null,
    2,
  ),
);

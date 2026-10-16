/** Read-only local audit: METRIO_DASHBOARD_CACHE may override the desktop cache path. */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { buildKpiFromIssues } from '../src/domain/jira/kpi';
import { collectUniqueTeamIssues } from '../src/domain/jira/uniqueIssues';
import type { AuditReportData } from '../src/domain/jira/types';
import type { TeamSnapshot } from '../src/domain/people/types';
import type { LegacyKpiData } from '../src/domain/legacy/legacyKpiTypes';
import { extractCanonicalPerformanceCycles } from '../src/domain/workflows/canonicalPerformance';
import { resolveWorkflowProfile } from '../src/domain/workflows/resolveWorkflowProfile';

const cachePath = process.env.METRIO_DASHBOARD_CACHE ?? join(
  homedir(),
  'Library/Application Support/com.altenar.metrio/dashboard_cache.json',
);
const raw = JSON.parse(readFileSync(cachePath, 'utf8')) as {
  fetchResult: { reportData: AuditReportData; teamSnapshot: TeamSnapshot };
};
const { reportData, teamSnapshot } = raw.fetchResult;
const hours = (ms: number | null | undefined) => ms == null ? null : Math.round(ms / 36000) / 100;

const rows = teamSnapshot.persons.map((person) => {
  const canonical = person.jira?.canonicalKey;
  // Cache written by the pre-V2 build: carries the legacy backflowCount/efficiencyIndex fields.
  const before = person.performance as unknown as LegacyKpiData | undefined;
  const after = buildKpiFromIssues(person.issues, {}, reportData.params, {
    contributorCanonical: canonical,
  });
  const ownershipChanges: string[] = [];
  for (const issue of person.issues) {
    const profile = resolveWorkflowProfile(issue);
    for (const cycle of extractCanonicalPerformanceCycles(issue, profile)) {
      if (!cycle.completedAt) continue;
      if (cycle.ownerCanonical && canonical && cycle.ownerCanonical !== canonical) {
        ownershipChanges.push(`${issue.issueKey}→${cycle.ownerCanonical}`);
      }
    }
  }
  return {
    person: person.bamboo.displayName,
    canonical,
    before: before && {
      completed: before.completedCount,
      firstPassCount: before.firstPassAcceptedCount,
      firstPassPercent: before.completedCount
        ? Math.round(before.firstPassAcceptedCount / before.completedCount * 10000) / 100
        : null,
      reworkedCyclesNamedBackflows: before.backflowCount,
      meanExecutionHours: hours(before.avgProgressToReviewMs),
      meanCycleHours: hours(before.avgTodoToApprovedMs),
      efficiency: before.efficiencyIndex,
    },
    after: {
      started: after.startedCount,
      completed: after.completedCount,
      throughput: after.throughputCount,
      firstPassCount: after.firstPassAcceptedCount,
      firstPassPercent: after.firstPassRatePercent,
      reworkedCycles: after.reworkedCycleCount,
      backflowEvents: after.backflowEventCount,
      medianExecutionHours: hours(after.medianExecutionMs),
      medianCycleHours: hours(after.medianCycleMs),
      medianReviewHours: hours(after.medianReviewMs),
      executionSamples: after.executionSampleCount,
      cycleSamples: after.cycleSampleCount,
      replacement: 'primitive_metrics',
    },
    cyclesPreviouslyCreditedToToucher: [...new Set(ownershipChanges)].slice(0, 20),
  };
});

const teamIssues = collectUniqueTeamIssues(teamSnapshot.persons);
const teamAfter = buildKpiFromIssues(teamIssues, {}, reportData.params);
const multiBackflowCycles = teamIssues.flatMap((issue) => {
  const profile = resolveWorkflowProfile(issue);
  return extractCanonicalPerformanceCycles(issue, profile)
    .filter((cycle) => cycle.backflowEventCount > 1)
    .map((cycle) => ({ issueKey: issue.issueKey, events: cycle.backflowEventCount }));
});

console.log(JSON.stringify({
  cachePath,
  params: reportData.params,
  methodologyVersion: teamAfter.methodologyVersion,
  teamBefore: reportData.teamKpi,
  teamAfter: {
    started: teamAfter.startedCount,
    completed: teamAfter.completedCount,
    firstPassCount: teamAfter.firstPassAcceptedCount,
    firstPassPercent: teamAfter.firstPassRatePercent,
    reworkedCycles: teamAfter.reworkedCycleCount,
    backflowEvents: teamAfter.backflowEventCount,
    medianExecutionHours: hours(teamAfter.medianExecutionMs),
    medianCycleHours: hours(teamAfter.medianCycleMs),
    medianReviewHours: hours(teamAfter.medianReviewMs),
    profiles: teamAfter.profileBreakdown,
  },
  rows,
  multiBackflowCycles,
}, null, 2));

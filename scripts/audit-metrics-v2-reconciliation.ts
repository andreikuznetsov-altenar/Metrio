/**
 * Read-only local audit for Metrics Methodology V2:
 *   1. person vs team reconciliation (completed, first pass, reworked cycles, backflow events)
 *   2. attribution of one person's previously "touched" cycles (default: Andrei)
 *   3. duration distributions (n, min, median, mean, P75, max) per measure, cross-checked
 *      against the production KPI medians/means/sample counts.
 *
 * Usage: TZ=UTC npx vite-node scripts/audit-metrics-v2-reconciliation.ts
 * METRIO_DASHBOARD_CACHE overrides the cache path; METRIO_AUDIT_PERSON overrides the person key.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { buildKpiFromIssues } from '../src/domain/jira/kpi';
import { collectUniqueTeamIssues } from '../src/domain/jira/uniqueIssues';
import type { AuditReportData } from '../src/domain/jira/types';
import type { LegacyKpiData } from '../src/domain/legacy/legacyKpiTypes';
import type { TeamSnapshot } from '../src/domain/people/types';
import {
  cycleCompletedInPeriod,
  extractCanonicalPerformanceCycles,
} from '../src/domain/workflows/canonicalPerformance';
import { isWorkflowKpiEligible } from '../src/domain/workflows/eligibility';
import { resolveWorkflowProfile } from '../src/domain/workflows/resolveWorkflowProfile';

const cachePath = process.env.METRIO_DASHBOARD_CACHE ?? join(
  homedir(),
  'Library/Application Support/com.altenar.metrio/dashboard_cache.json',
);
const focus = (process.env.METRIO_AUDIT_PERSON ?? 'andrei.kuznetsov').toLowerCase();
const raw = JSON.parse(readFileSync(cachePath, 'utf8')) as {
  fetchResult: { reportData: AuditReportData; teamSnapshot: TeamSnapshot };
};
const { reportData, teamSnapshot } = raw.fetchResult;
const params = reportData.params;
const h = (ms: number | null | undefined) => ms == null ? null : Math.round(ms / 36000) / 100;

// ---- 1. Reconciliation -------------------------------------------------------------------
const teamIssues = collectUniqueTeamIssues(teamSnapshot.persons);
// The KPI only counts KPI-eligible issue types (epics etc. are excluded); mirror that here.
const eligibleTeamIssues = teamIssues.filter(isWorkflowKpiEligible);
const team = buildKpiFromIssues(teamIssues, {}, params);
const people = teamSnapshot.persons.map((person) => ({
  person: person.bamboo.displayName,
  canonical: person.jira?.canonicalKey,
  kpi: buildKpiFromIssues(person.issues, {}, params, { contributorCanonical: person.jira?.canonicalKey }),
}));
const sum = (pick: (k: typeof team) => number) => people.reduce((acc, p) => acc + pick(p.kpi), 0);
const reconciliation = (['completedCount', 'firstPassAcceptedCount', 'reworkedCycleCount', 'backflowEventCount'] as const)
  .map((key) => {
    const persons = sum((k) => k[key]);
    return { metric: key, sumOfPersons: persons, team: team[key], reconciles: persons === team[key] };
  });

// Completed cycles whose owner is outside the team roster cannot reconcile; surface them.
const rosterKeys = new Set(people.map((p) => p.canonical).filter(Boolean));
const outsideRoster: string[] = [];
for (const issue of eligibleTeamIssues) {
  for (const cycle of extractCanonicalPerformanceCycles(issue, resolveWorkflowProfile(issue))) {
    if (!cycleCompletedInPeriod(cycle, params)) continue;
    if (cycle.ownerCanonical && !rosterKeys.has(cycle.ownerCanonical)) {
      outsideRoster.push(`${issue.issueKey}→${cycle.ownerCanonical}`);
    }
  }
}

// ---- 2. Attribution for the focus person -------------------------------------------------
const focusPerson = teamSnapshot.persons.find((p) => (p.jira?.canonicalKey ?? '').toLowerCase().startsWith(focus));
let attribution: unknown = null;
if (focusPerson) {
  const key = focusPerson.jira?.canonicalKey;
  const legacy = focusPerson.performance as unknown as LegacyKpiData | undefined;
  const byOwner = new Map<string, number>();
  let ownedByFocus = 0;
  const keysWithCompletion = new Set<string>();
  for (const issue of focusPerson.issues.filter(isWorkflowKpiEligible)) {
    for (const cycle of extractCanonicalPerformanceCycles(issue, resolveWorkflowProfile(issue))) {
      if (!cycleCompletedInPeriod(cycle, params)) continue;
      keysWithCompletion.add(issue.issueKey);
      const owner = cycle.ownerCanonical ?? 'unowned';
      byOwner.set(owner, (byOwner.get(owner) ?? 0) + 1);
      if (owner === key) ownedByFocus += 1;
    }
  }
  const v2 = buildKpiFromIssues(focusPerson.issues, {}, params, { contributorCanonical: key });
  attribution = {
    person: focusPerson.bamboo.displayName,
    cachedPreV2Completed: legacy?.completedCount,
    touchedIssuesWithCompletedCycle: keysWithCompletion.size,
    completedCyclesInFocusIssuesByV2Owner: Object.fromEntries([...byOwner.entries()].sort((a, b) => b[1] - a[1])),
    v2OwnedByFocus: ownedByFocus,
    v2KpiCompleted: v2.completedCount,
    v2FirstPass: v2.firstPassAcceptedCount,
    consistent: ownedByFocus === v2.completedCount,
  };
}

// ---- 3. Duration distributions -----------------------------------------------------------
function stats(values: number[]) {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return { n: 0, min: null, median: null, mean: null, p75: null, max: null };
  const q = (p: number) => {
    const idx = (v.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return v[lo]! + (v[hi]! - v[lo]!) * (idx - lo);
  };
  return {
    n: v.length, min: h(v[0]), median: h(q(0.5)), mean: h(v.reduce((a, b) => a + b, 0) / v.length),
    p75: h(q(0.75)), max: h(v[v.length - 1]),
  };
}
const execution: number[] = [];
const cycleDurations: number[] = [];
const review: number[] = [];
let completedCycles = 0;
let zeroExecution = 0;
const cycleRows: Array<{ issueKey: string; profile: string; owner?: string; executionH: number; cycleH: number | null; reviewH: number; startedAt: string; completedAt: string | null }> = [];
for (const issue of eligibleTeamIssues) {
  for (const cycle of extractCanonicalPerformanceCycles(issue, resolveWorkflowProfile(issue))) {
    if (!cycleCompletedInPeriod(cycle, params)) continue;
    completedCycles += 1;
    cycleRows.push({ issueKey: issue.issueKey, profile: cycle.profileId, owner: cycle.ownerCanonical, executionH: h(cycle.executionMs)!, cycleH: h(cycle.cycleMs), reviewH: h(cycle.reviewMs)!, startedAt: cycle.startedAt, completedAt: cycle.completedAt });
    if (cycle.executionMs > 0) execution.push(cycle.executionMs); else zeroExecution += 1;
    if (cycle.cycleMs !== null) cycleDurations.push(cycle.cycleMs);
    if (cycle.reviewMs > 0) review.push(cycle.reviewMs);
  }
}
const distributions = {
  completedCycles,
  executionHours: { ...stats(execution), zeroExecutionCycles: zeroExecution },
  cycleHours: stats(cycleDurations),
  reviewHours: stats(review),
  zeroCycleDurationCount: cycleDurations.filter((v) => v === 0).length,
  topExecution: [...cycleRows].sort((a, b) => b.executionH - a.executionH).slice(0, 5),
  topCycle: [...cycleRows].sort((a, b) => (b.cycleH ?? 0) - (a.cycleH ?? 0)).slice(0, 3),
  kpiCrossCheck: {
    executionMatches: stats(execution).n === team.executionSampleCount && stats(execution).median === h(team.medianExecutionMs) && stats(execution).mean === h(team.meanExecutionMs),
    cycleMatches: stats(cycleDurations).n === team.cycleSampleCount && stats(cycleDurations).median === h(team.medianCycleMs) && stats(cycleDurations).mean === h(team.meanCycleMs),
    reviewMatches: stats(review).n === team.reviewSampleCount && stats(review).median === h(team.medianReviewMs) && stats(review).mean === h(team.meanReviewMs),
  },
};

console.log(JSON.stringify({
  cachePath,
  params: { dateFrom: params.dateFrom, dateTo: params.dateTo },
  reconciliation,
  outsideRosterOwners: outsideRoster,
  perPerson: people.map((p) => ({
    person: p.person,
    completed: p.kpi.completedCount,
    firstPass: p.kpi.firstPassAcceptedCount,
    reworkedCycles: p.kpi.reworkedCycleCount,
    backflowEvents: p.kpi.backflowEventCount,
  })),
  attribution,
  distributions,
}, null, 2));

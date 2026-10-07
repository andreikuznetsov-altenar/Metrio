import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildKpiFromIssues } from '../jira/kpi';
import { getCycleSegments, buildCompletedCyclesFromSegments } from '../jira/cycles';
import type { AuditIssue, KpiData, ReportParams } from '../jira/types';
import { calculateWorkload } from '../workload/workloadEngine';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { buildWskinsKpiFromIssues } from '../workflows/wskinsKpi';
import {
  legacyBuildCompletedCyclesFromSegments_,
  legacyBuildKpiFromIssues_,
  legacyFlattenGroupedIssues_,
  legacyGetCycleSegments_,
  legacyIsDateWithinRange_,
} from './legacy/uxCodeGsReference';
import { legacyBuildWSkinsKpiFromIssues_ } from './legacy/wskinsAuditGsReference';
import {
  TEAM_REASSIGNMENT_GROUPED,
  UX_FIXTURES,
  WSKINS_FIXTURES,
  type ParityFixture,
} from './pass14LegacyParity.fixtures';

export type ParityVerdict = 'MATCH' | 'MISMATCH' | 'INTENTIONAL' | 'PRODUCT_RULE';

export interface MetricParityRow {
  fixture: string;
  metric: string;
  legacy: string;
  metrio: string;
  verdict: ParityVerdict;
  reason: string;
  sourceLegacy: string;
  sourceMetrio: string;
}

const KPI_FIELDS: Array<keyof KpiData> = [
  'startedCount',
  'completedCount',
  'reviewSubmittedCount',
  'firstPassAcceptedCount',
  'backflowCount',
  'holdCount',
  'avgProgressToReviewMs',
  'avgReviewToDoneMs',
  'avgTodoToApprovedMs',
  'efficiencyIndex',
];

const rows: MetricParityRow[] = [];

function fmt(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  return String(value);
}

function truncateToRange(issues: AuditIssue[], params: ReportParams): AuditIssue[] {
  return issues.map((issue) => {
    const rangeEvents = (issue.events || []).filter(
      (event) => event.eventType !== 'Status' || legacyIsDateWithinRange_(event.changedAt, params),
    );
    return { ...issue, rangeEvents };
  });
}

function addRow(row: MetricParityRow) {
  rows.push(row);
}

function compareKpi(
  fixture: ParityFixture,
  legacy: KpiData,
  metrio: KpiData,
  options: {
    sourceLegacy: string;
    sourceMetrio: string;
    intentional?: Partial<Record<keyof KpiData, string>>;
  },
) {
  KPI_FIELDS.forEach((metric) => {
    const left = legacy[metric];
    const right = metrio[metric];
    const same = left === right;
    const intentional = options.intentional?.[metric];
    addRow({
      fixture: fixture.id,
      metric,
      legacy: fmt(left),
      metrio: fmt(right),
      verdict: same ? 'MATCH' : intentional ? 'INTENTIONAL' : 'MISMATCH',
      reason: same
        ? 'Identical on the same fixture.'
        : intentional || 'Unexplained difference between GS oracle and Metrio.',
      sourceLegacy: options.sourceLegacy,
      sourceMetrio: options.sourceMetrio,
    });
  });
}

function writeParityReport() {
  const here = dirname(fileURLToPath(import.meta.url));
  const reportPath = join(here, '../../../docs/pass14-legacy-parity-report.md');
  mkdirSync(dirname(reportPath), { recursive: true });

  const mismatches = rows.filter((row) => row.verdict === 'MISMATCH');
  const metricRollup = new Map<
    string,
    { match: number; intentional: number; mismatch: number; product: number }
  >();
  rows.forEach((row) => {
    const current = metricRollup.get(row.metric) || {
      match: 0,
      intentional: 0,
      mismatch: 0,
      product: 0,
    };
    if (row.verdict === 'MATCH') current.match += 1;
    else if (row.verdict === 'INTENTIONAL') current.intentional += 1;
    else if (row.verdict === 'PRODUCT_RULE') current.product += 1;
    else current.mismatch += 1;
    metricRollup.set(row.metric, current);
  });
  const lines = [
    '# PASS 14.4 Legacy parity report',
    '',
    'Executable harness: `src/domain/parity/pass14LegacyParity.test.ts`.',
    '',
    'Legacy oracle is a test-only verbatim port of:',
    '',
    '- `docs/canonical-legacy/apps-script/Code.gs` (`buildKpiFromIssues_`, `getCycleSegments_`, `calculateEfficiencyIndex_`)',
    '- `docs/canonical-legacy/apps-script/WskinsAudit.gs` (`buildWSkinsKpiFromIssues_`, main/subtask contributions, `calculateWSkinsEfficiencyIndex_`)',
    '',
    'Production Metrio is **not** used as the legacy reference.',
    '',
    'UX Apps Script date-filters changelog via `rangeEvents`. Metrio product KPI uses full history and keeps cycles whose `completedAt` falls in the inclusive `dateFrom`/`dateTo` window. Fixtures feed the GS oracle range-truncated events so period semantics are comparable.',
    '',
    'Workload / capacity is **not** a GS Time Stat port. Those rows are tagged `PRODUCT_RULE` against PASS 14.1 canonical rules.',
    '',
    `Generated rows: ${rows.length}. Unexplained mismatches: ${mismatches.length}.`,
    '',
    '## Metric rollup',
    '',
    '| Metric | MATCH | INTENTIONAL | PRODUCT_RULE | MISMATCH |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...[...metricRollup.entries()].map(
      ([metric, counts]) =>
        `| ${metric} | ${counts.match} | ${counts.intentional} | ${counts.product} | ${counts.mismatch} |`,
    ),
    '',
    '## Fixture detail',
    '',
    '| Fixture | Metric | Legacy | Metrio | Verdict | Reason | Source legacy | Source Metrio |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| ${row.fixture} | ${row.metric} | ${row.legacy} | ${row.metrio} | ${row.verdict} | ${row.reason.replace(/\|/g, '/')} | \`${row.sourceLegacy}\` | \`${row.sourceMetrio}\` |`,
    ),
    '',
    '## Cycle engine',
    '',
    'Production `getCycleSegments` is compared to `getCycleSegments_` on the same full event list (not truncated). A mismatch there is a port defect.',
    '',
    '## Intentional product KPI differences',
    '',
    '| Area | Why |',
    '| --- | --- |',
    '| Backflow progress→review / review→done | GS keeps the first Review entry; Metrio profile cycles measure to the last Review entry before Done. Counts (completed/backflow/first-pass) still follow GS. |',
    '| Mixed UX+WSkins team efficiency | Weighted per-profile efficiency. Pure UX fixtures use `calculateEfficiencyIndex`. |',
    '| Capacity / workload | PASS 14.1 product rules: Review/QA/hold/waiting are not Active and not capacity. Monthly load uses in-period activeCapacityMs only; pre-period In Progress is not annualized. Legacy Time Stat used progress→review minutes and 3-tier load. |',
    '',
  ];
  writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
}

describe('PASS 14.4 legacy Apps Script parity harness', () => {
  it('ports getCycleSegments_ into production getCycleSegments on identical events', () => {
    for (const fixture of UX_FIXTURES) {
      for (const issue of fixture.issues) {
        const legacy = legacyGetCycleSegments_(issue, fixture.params);
        const metrio = getCycleSegments(issue, fixture.params);
        expect(metrio, `${fixture.id} ${issue.issueKey} cycle segments`).toEqual(legacy);
        expect(buildCompletedCyclesFromSegments(metrio)).toEqual(
          legacyBuildCompletedCyclesFromSegments_(legacy),
        );
      }
    }
  });

  it('evaluates UX fixtures against Code.gs oracle and Metrio product KPI', () => {
    for (const fixture of UX_FIXTURES) {
      const gsIssues = truncateToRange(fixture.issues, fixture.params);
      const legacy = legacyBuildKpiFromIssues_(gsIssues, {}, fixture.params);
      const metrio = buildKpiFromIssues(fixture.issues, {}, fixture.params);
      const backflowDuration =
        fixture.flow === 'backflow' || fixture.flow === 'backflow-cycle'
          ? 'GS uses first Review entry; Metrio profile cycles use last Review entry. Count metrics remain the GS completed-cycle model.'
          : undefined;
      compareKpi(fixture, legacy, metrio, {
        sourceLegacy: 'Code.gs buildKpiFromIssues_ / getCycleSegments_',
        sourceMetrio: 'buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles',
        intentional: backflowDuration
          ? {
              avgProgressToReviewMs: backflowDuration,
              avgReviewToDoneMs: backflowDuration,
              avgTodoToApprovedMs: backflowDuration,
              efficiencyIndex: backflowDuration,
            }
          : undefined,
      });
    }
  });

  it('evaluates WSkins fixtures against WskinsAudit.gs oracle and Metrio WSkins KPI', () => {
    for (const fixture of WSKINS_FIXTURES) {
      const legacy = legacyBuildWSkinsKpiFromIssues_(fixture.issues, fixture.params);
      const metrioDirect = buildWskinsKpiFromIssues(fixture.issues, fixture.params);
      const metrioProduct = buildKpiFromIssues(fixture.issues, {}, fixture.params);
      compareKpi(fixture, legacy, metrioDirect, {
        sourceLegacy: 'WskinsAudit.gs buildWSkinsKpiFromIssues_',
        sourceMetrio: 'wskinsKpi.ts buildWskinsKpiFromIssues',
      });
      compareKpi(
        { ...fixture, id: `${fixture.id}/product` },
        legacy,
        metrioProduct,
        {
          sourceLegacy: 'WskinsAudit.gs buildWSkinsKpiFromIssues_',
          sourceMetrio: 'buildKpiFromIssues → buildWorkflowKpi (wskins branch)',
        },
      );
    }
  });

  it('compares per-user and team KPI on a reassignment grouping', () => {
    const params = UX_FIXTURES[0].params;
    const aliceIssues = TEAM_REASSIGNMENT_GROUPED['alice@example.com'].issues;
    const bobIssues = TEAM_REASSIGNMENT_GROUPED['bob@example.com'].issues;
    const teamIssues = legacyFlattenGroupedIssues_(TEAM_REASSIGNMENT_GROUPED);

    const aliceLegacy = legacyBuildKpiFromIssues_(truncateToRange(aliceIssues, params), {}, params);
    const aliceMetrio = buildKpiFromIssues(aliceIssues, {}, params);
    const bobLegacy = legacyBuildKpiFromIssues_(truncateToRange(bobIssues, params), {}, params);
    const bobMetrio = buildKpiFromIssues(bobIssues, {}, params);
    const teamLegacy = legacyBuildKpiFromIssues_(truncateToRange(teamIssues, params), {}, params);
    const teamMetrio = buildKpiFromIssues(teamIssues, {}, params);

    const fake: ParityFixture = {
      id: 'per-user-alice',
      title: 'Per-user Alice',
      flow: 'per-user',
      params,
      issues: aliceIssues,
      compareUxLegacy: true,
      compareWskinsLegacy: false,
      compareWorkloadProduct: false,
    };
    compareKpi(fake, aliceLegacy, aliceMetrio, {
      sourceLegacy: 'Code.gs buildKpiFromIssues_ (user block)',
      sourceMetrio: 'buildKpiFromIssues (user issues)',
    });
    compareKpi({ ...fake, id: 'per-user-bob' }, bobLegacy, bobMetrio, {
      sourceLegacy: 'Code.gs buildKpiFromIssues_ (user block)',
      sourceMetrio: 'buildKpiFromIssues (user issues)',
    });
    compareKpi({ ...fake, id: 'team-kpi-unique-keys' }, teamLegacy, teamMetrio, {
      sourceLegacy: 'Code.gs flattenGroupedIssues_ + buildKpiFromIssues_',
      sourceMetrio: 'unique issueKey flatten + buildKpiFromIssues',
    });

    expect(teamMetrio.completedCount).toBe(2);
    expect(aliceMetrio.completedCount).toBe(2);
    expect(bobMetrio.completedCount).toBe(1);
  });

  it('validates workload against PASS 14.1 product rules, not GS Time Stat', () => {
    const workloadFixtures = [...UX_FIXTURES, ...WSKINS_FIXTURES].filter(
      (fixture) => fixture.compareWorkloadProduct,
    );
    for (const fixture of workloadFixtures) {
      const result = calculateWorkload(fixture.issues, fixture.params);
      const unique = [...new Map(fixture.issues.map((issue) => [issue.issueKey, issue])).values()];
      let expectedActive = 0;
      let expectedReview = 0;
      let expectedHold = 0;
      let expectedWaiting = 0;
      for (const issue of unique) {
        const profile = resolveWorkflowProfile(issue);
        const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
        if (stage.isCompletion || stage.canonicalStage === 'cancelled') continue;
        if (stage.countsAsActiveWork) expectedActive++;
        if (stage.countsAsReview) expectedReview++;
        if (stage.countsAsHold) expectedHold++;
        if (stage.countsAsWaiting) expectedWaiting++;
        expect(stage.countsAsReview && stage.countsAsActiveWork).toBe(false);
        if (stage.countsAsReview) {
          expect(stage.countsAsCapacityContributor).toBe(false);
        }
      }
      expect(result.activeWorkCount).toBe(expectedActive);
      expect(result.reviewCount).toBe(expectedReview);
      expect(result.holdCount).toBe(expectedHold);
      expect(result.waitingCount).toBe(expectedWaiting);
      if ((result.capacityLoadPercent ?? 0) > 100) {
        expect(result.level).toBe('overloaded');
      } else if (result.level === 'overloaded') {
        expect(result.capacityLoadPercent ?? 0).toBeGreaterThan(100);
      }
      addRow({
        fixture: fixture.id,
        metric: 'activeWorkCount',
        legacy: 'n/a (Time Stat is not this model)',
        metrio: fmt(result.activeWorkCount),
        verdict: 'PRODUCT_RULE',
        reason:
          'Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port.',
        sourceLegacy: 'n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used',
        sourceMetrio: 'capacityWorkload.countOperationalWorkload / calculateWorkload',
      });
      addRow({
        fixture: fixture.id,
        metric: 'capacityLoadPercent',
        legacy: 'n/a',
        metrio: fmt(result.capacityLoadPercent),
        verdict: 'PRODUCT_RULE',
        reason: `capacityDataState=${result.capacityDataState}; level=${result.level}. Overloaded only when load > 100.`,
        sourceLegacy: 'n/a',
        sourceMetrio: 'calculateCapacityBreakdown',
      });
    }
  });

  it('writes the parity report and forbids unexplained mismatches', () => {
    writeParityReport();
    const mismatches = rows.filter((row) => row.verdict === 'MISMATCH');
    expect(mismatches, JSON.stringify(mismatches, null, 2)).toEqual([]);
  });
});

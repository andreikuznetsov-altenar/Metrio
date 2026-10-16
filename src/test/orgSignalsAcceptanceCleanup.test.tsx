import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectPersonNotificationTransitions } from '../platform/notifications';
import { DEFAULT_PREFERENCES } from '../platform/preferences';
import { performanceHelp } from '../domain/performance/performanceHelp';
import {
  REWORK_RATE_ELEVATED_PERCENT,
  REWORK_RATE_MIN_COMPLETED_SAMPLE,
  isReworkElevated,
  reworkTrendNote,
  firstPassPercentFromCounts,
  firstPassFraction,
  reworkRateFraction,
  coordinatedRatePercents,
  reworkRatePercent,
  reworkRateMetric,
} from '../domain/performance/reworkRate';
import { workloadDisplayLabel } from '../domain/workload/workloadDisplay';
import { formatBusinessDuration, formatWeekdayCount, formatWeekdayDuration } from '../domain/jira/dates';
import { calculateWorkload } from '../domain/workload/workloadEngine';
import { capacityPresentationLabel } from '../domain/workload/capacityPresentation';
import { formatWorkloadLabel } from '../domain/people/personDisplay';
import type { Person } from '../domain/people/types';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function person(level: 'low' | 'normal' | 'high' | 'overloaded'): Person {
  return {
    id: 'p1',
    bamboo: { id: 'p1', displayName: 'Sam Dev', firstName: 'Sam', lastName: 'Dev', workEmail: 's@co.com', jobTitle: 'Eng', status: 'Active' },
    jira: null,
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    workload: { level, score: 0, activeCount: 0, inProgressCount: 0, inReviewCount: 0, problematicCount: 0, atRiskCount: 0, overdueCount: 0, summary: '' },
    performance: null,
    issues: [],
    ownedIssues: [],
  } as unknown as Person;
}

describe('Current Workload label is one vocabulary on every surface', () => {
  const cases: [Parameters<typeof person>[0], string][] = [
    ['low', 'Light'],
    ['normal', 'Balanced'],
    ['high', 'Heavy'],
    ['overloaded', 'Overloaded'],
  ];

  it.each(cases)('%s → %s in People, drawer, dashboard, notification and summary', (level, label) => {
    const p = person(level);
    expect(workloadDisplayLabel(level)).toBe(label); // People table / drawer / dashboard share this mapping
    expect(formatWorkloadLabel(level, { workload: p.workload })).toBe(label); // person drawer / header
    expect(capacityPresentationLabel(p.workload)).toBe(label); // dashboard + distribution
  });

  it('the notification says "Heavy"/"Overloaded", titled "Current workload changed", never raw "high"', () => {
    for (const [level, label] of [['high', 'Heavy'], ['overloaded', 'Overloaded']] as const) {
      const prefs = structuredClone(DEFAULT_PREFERENCES);
      prefs.notificationState.workloadLevels = { p1: 'normal' } as never;
      const { descriptors } = collectPersonNotificationTransitions([person(level)], prefs);
      const event = descriptors.find((d) => d.type === 'workload_change');
      expect(event?.title).toBe('Current workload changed');
      expect(event?.message).toBe(`Sam Dev is ${label}`);
      expect(event?.message).not.toMatch(/\bhigh\b/i);
      expect(event?.native?.body).toBe(`Sam Dev is ${label}`);
    }
  });

  it('the domain summary uses the display label, not its own wording', () => {
    const result = calculateWorkload([], { dateFrom: '2026-01-01', dateTo: '2026-02-01', targetReviewDays: 3, users: [], projects: [] });
    expect(result.summary).toMatch(/^Light workload/);
    expect(read('src/domain/workload/workloadEngine.ts')).not.toMatch(/'High'|workloadLevelLabel/);
  });

  it('no user-facing source says "high workload" (Heavy / Overloaded instead)', () => {
    for (const file of [
      'src/services/export/buildPerformanceExportData.ts',
      'src/services/people/personService.ts',
      'src/fixtures/docFixtureData.ts',
      'src/platform/notifications.ts',
    ]) {
      expect(read(file)).not.toMatch(/high workload/i);
    }
    expect(read('src/services/export/buildPerformanceExportData.ts')).toContain('Heavy / Overloaded');
  });
});

describe('Rework Rate', () => {
  it('is a visible metric card = reworked / completed, with clean handling of tiny denominators', () => {
    expect(reworkRateMetric({ completedCount: 20, reworkedCycleCount: 5 })).toMatchObject({
      label: 'Rework Rate',
      value: '25%',
      status: '5 of 20 cycles',
    });
    expect(reworkRateMetric({ completedCount: 0, reworkedCycleCount: 0 }).value).toBe('—');
    expect(reworkRateMetric({ completedCount: 2, reworkedCycleCount: 1 }).status).toMatch(/small sample/);
    expect(reworkRateMetric(null).value).toBe('—');
  });

  it('the formula is reworked / completed straight from the counts, never from a rounded First Pass', () => {
    expect(reworkRateFraction({ completedCount: 30, reworkedCycleCount: 2 })).toBe(2 / 30);
    expect(firstPassFraction({ completedCount: 30, reworkedCycleCount: 2 })).toBe(28 / 30);
    // an unrelated / stale First Pass presentation value can no longer influence Rework Rate:
    // the card takes counts only
    expect(reworkRateMetric.length).toBe(1);
    expect(reworkRateMetric({ completedCount: 30, reworkedCycleCount: 2 }).value).toBe('6.67%');
  });

  it.each([
    [32, 1, 96.88, 3.12], // 3.125 tie: independent rounding would show 96.88 + 3.13 = 100.01
    [3, 1, 66.67, 33.33], // 1/3: the leftover cent goes to the larger remainder
    [30, 2, 93.33, 6.67],
    [8, 1, 87.5, 12.5],
    [7, 0, 100, 0],
    [7, 7, 0, 100],
  ])('edge case %i completed / %i reworked → First Pass %d%% + Rework Rate %d%% = 100', (completed, reworked, fp, rr) => {
    const counts = { completedCount: completed, reworkedCycleCount: reworked };
    expect(firstPassPercentFromCounts(counts)).toBe(fp);
    expect(reworkRatePercent(counts)).toBe(rr);
    expect(Math.round(((fp as number) + (rr as number)) * 100) / 100).toBe(100);
    expect(completed - reworked + reworked).toBe(completed); // firstPassCycles + reworkedCycles
  });

  it('0 completed cycles: no percentages, the card says so cleanly', () => {
    expect(firstPassPercentFromCounts({ completedCount: 0, reworkedCycleCount: 0 })).toBeNull();
    expect(reworkRatePercent({ completedCount: 0, reworkedCycleCount: 0 })).toBeNull();
    expect(reworkRateMetric({ completedCount: 0, reworkedCycleCount: 0 })).toMatchObject({ value: '—', status: 'No completed cycles' });
  });

  it('displayed percentages sum to exactly 100 and stay within one cent of the exact value for every count', () => {
    for (let completed = 1; completed <= 120; completed += 1) {
      for (let reworked = 0; reworked <= completed; reworked += 1) {
        const counts = { completedCount: completed, reworkedCycleCount: reworked };
        const both = coordinatedRatePercents(counts)!;
        expect(Math.round((both.firstPass + both.rework) * 100)).toBe(10000);
        expect(Math.abs(both.rework - (reworked / completed) * 100)).toBeLessThanOrEqual(0.0100001);
        expect(Math.abs(both.firstPass - ((completed - reworked) / completed) * 100)).toBeLessThanOrEqual(0.0100001);
      }
    }
  });

  it('is wired into the interactive team, person and organization summaries and their tooltips', () => {
    expect(read('src/services/performance/performanceViewModel.ts')).toContain('reworkRateMetric(teamKpi)');
    expect(read('src/domain/analytics/personAnalyticsWorkspace.ts')).toContain('reworkRateMetric(perf)');
    expect(read('src/domain/organization/buildOrganizationModel.ts')).toContain('reworkRateMetric(kpi)');
    for (const file of [
      'src/pages/performance/TeamOverviewView.tsx',
      'src/pages/performance/PersonPerformanceMetrics.tsx',
      'src/pages/performance/PersonAnalyticsMetricGrid.tsx',
    ]) {
      expect(read(file)).toContain('"Rework Rate": performanceHelp.reworkRate');
    }
    expect(read('src/services/export/buildPerformanceExportData.ts')).toContain("label: 'Rework Rate'");
  });

  it('"Rework elevated" uses the rate with a sample guard, never an absolute count', () => {
    expect(REWORK_RATE_MIN_COMPLETED_SAMPLE).toBe(5);
    expect(REWORK_RATE_ELEVATED_PERCENT).toBe(40);
    // tiny samples never trigger, however bad the ratio
    expect(isReworkElevated({ completedCount: 1, reworkedCycleCount: 1 })).toBe(false);
    expect(isReworkElevated({ completedCount: 4, reworkedCycleCount: 4 })).toBe(false);
    // same rate, bigger sample: triggers
    expect(isReworkElevated({ completedCount: 5, reworkedCycleCount: 2 })).toBe(true);
    // a big, healthy team with many reworked cycles is NOT elevated (rate 10%)
    expect(isReworkElevated({ completedCount: 100, reworkedCycleCount: 10 })).toBe(false);
    expect(read('src/domain/organization/buildOrganizationModel.ts')).not.toMatch(/reworkedCycleCount\s*>=\s*3/);
  });

  it('the organization trend label follows the rate (small sample ≠ stable ≠ elevated)', () => {
    expect(reworkTrendNote({ completedCount: 3, reworkedCycleCount: 3 })).toBe('Rework sample small');
    expect(reworkTrendNote({ completedCount: 10, reworkedCycleCount: 5 })).toBe('Rework elevated');
    expect(reworkTrendNote({ completedCount: 40, reworkedCycleCount: 5 })).toBe('Delivery stable');
  });
});

describe('metric semantics wording', () => {
  it('Backflow Events tooltip explains the period semantics next to Rework Rate', () => {
    expect(performanceHelp.backflows).toMatch(/actual event timestamp/);
    expect(performanceHelp.backflows).toMatch(/owner at that time/);
    expect(performanceHelp.backflows).toMatch(/1 reworked cycle and 0 Backflow Events/);
    expect(performanceHelp.reworkRate).toMatch(/dated by its completion/);
  });

  it('weekdays and business days are named explicitly', () => {
    expect(formatWeekdayCount(1)).toBe('1 weekday');
    expect(formatWeekdayCount(10)).toBe('10 weekdays');
    expect(formatWeekdayCount(0)).toBe('<1 weekday');
    expect(formatWeekdayDuration(2 * 24 * 3_600_000 + 3 * 3_600_000)).toBe('2 weekdays 3h');
    expect(formatBusinessDuration(16 * 3_600_000 + 2 * 3_600_000)).toBe('2 business days 2h');
    // neither is ever just "N days"
    expect(formatWeekdayCount(3)).not.toMatch(/^\d+ days?$/);
  });
});

describe('person drawer keeps its balanced 2 × 2 KPI block', () => {
  it('folds Rework Rate into the First Pass card instead of adding a fifth card', async () => {
    const { foldReworkRateIntoFirstPass } = await import('../pages/performance/PersonPerformanceMetrics');
    const folded = foldReworkRateIntoFirstPass([
      { label: 'Throughput', value: '9' },
      { label: 'First Pass', value: '92.86%' },
      reworkRateMetric({ completedCount: 28, reworkedCycleCount: 2 }),
      { label: 'Completed', value: '28' },
      { label: 'Backflow Events', value: '3' },
    ]);
    expect(folded.map((m) => m.label)).toEqual(['Throughput', 'First Pass', 'Completed', 'Backflow Events']);
    expect(folded[1]!.detail).toBe('Rework Rate 7.14%');
  });
});

describe('"Capacity" only means scheduling capacity in user-facing copy', () => {
  const read2 = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

  it('current-workload surfaces are not labelled Capacity', () => {
    expect(read2('src/domain/home/buildDashboardKpis.ts')).toContain('label: "Heavy / Overloaded"');
    expect(read2('src/domain/home/buildDashboardKpis.ts')).toContain('label: "Workload imbalance"');
    expect(read2('src/pages/home/dashboard/DashboardTeamCapacityVisual.tsx')).toContain('Current workload distribution');
    expect(read2('src/pages/home/dashboard/DashboardTeamCapacityCard.tsx')).toContain('Availability &amp; workload');
    for (const file of [
      'src/pages/performance/director/DirectorOverviewView.tsx',
      'src/pages/performance/director/LeadershipBranchesPerformanceView.tsx',
    ]) {
      expect(read2(file)).not.toMatch(/label="Capacity"|<dt>Capacity<\/dt>|ariaLabel="Capacity"/);
      expect(read2(file)).toContain('Current workload');
    }
  });

  it('copy says "is Overloaded" / "Heavy or Overloaded" / "Current workload: <level>", never "overloaded workload"', () => {
    for (const file of [
      'src/domain/actions/buildTeamActions.ts',
      'src/domain/recommendedActions/buildRecommendedActions.ts',
      'src/domain/recommendations/buildProductRecommendations.ts',
      'src/domain/home/executiveDashboardModel.ts',
    ]) {
      expect(read2(file)).not.toMatch(/overloaded workload|elevated current workload|workload is (heavy|overloaded|high)/i);
    }
    expect(read2('src/domain/actions/buildTeamActions.ts')).toContain('is Overloaded');
  });
});

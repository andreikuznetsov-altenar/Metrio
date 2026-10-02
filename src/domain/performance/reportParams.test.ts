import { describe, expect, it } from 'vitest';
import {
  createPerformanceDateRange,
  previousComparableRange,
  validatePerformanceDateRange,
} from './performanceDateRange';
import { resolveReviewTargetPolicy } from './reviewTargetPolicy';
import { resolvePerformanceReportRanges } from './reportParams';

describe('performanceDateRange', () => {
  it('validates From <= To', () => {
    expect(
      validatePerformanceDateRange({
        from: '2026-03-10',
        to: '2026-03-01',
        preset: 'custom',
      }).valid,
    ).toBe(false);
  });

  it('previous comparable range has equal inclusive length', () => {
    const range = {
      from: '2026-09-10',
      to: '2026-09-20',
      preset: 'custom' as const,
    };
    const prev = previousComparableRange(range);
    expect(prev).toEqual({
      from: '2026-08-30',
      to: '2026-09-09',
      preset: 'custom',
    });
  });
});

describe('reviewTargetPolicy', () => {
  it('sprint uses shorter review SLA than team on same scope', () => {
    const team = resolveReviewTargetPolicy('team', 3, 'team');
    const sprint = resolveReviewTargetPolicy('sprint', 3, 'team');
    expect(team.teamScope).toBe('direct');
    expect(sprint.teamScope).toBe('direct');
    expect(sprint.targetReviewDays).toBeLessThan(team.targetReviewDays);
  });

  it('org expands scope to full team', () => {
    const org = resolveReviewTargetPolicy('org', 3, 'team');
    expect(org.teamScope).toBe('full');
  });
});

describe('resolvePerformanceReportRanges', () => {
  it('maps org review target to full team scope for managers', () => {
    const ranges = resolvePerformanceReportRanges(
      createPerformanceDateRange('30d'),
      'org',
      'team',
      3,
    );
    expect(ranges.teamScope).toBe('full');
    expect(ranges.targetReviewDays).toBe(3);
    expect(ranges.fetchDateFrom <= ranges.displayDateFrom).toBe(true);
  });

  it('applies sprint target review days on employee audience', () => {
    const ranges = resolvePerformanceReportRanges(
      createPerformanceDateRange('7d'),
      'sprint',
      'employee',
      3,
    );
    expect(ranges.teamScope).toBe('direct');
    expect(ranges.targetReviewDays).toBe(2);
  });
});

import { format } from 'date-fns';
import type { WorkHistoryPeriod } from './workHistory';

export function formatWorkHistoryGroupLabel(
  periodKey: string,
  period: WorkHistoryPeriod,
): string {
  if (period === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
    if (match) {
      return format(
        new Date(Number(match[1]), Number(match[2]) - 1, 1),
        'MMMM yyyy',
      );
    }
  }
  if (period === 'quarter') {
    const match = /^(\d{4})-Q(\d)$/.exec(periodKey);
    if (match) {
      return `Q${match[2]} ${match[1]}`;
    }
  }
  if (period === 'week') {
    const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
    if (match) {
      return `Week ${Number(match[2])}, ${match[1]}`;
    }
  }
  return periodKey;
}

export function formatWorkHistoryGroupSummary(group: {
  completedCount: number;
  firstPassCount: number;
  reviewReturns: number;
}): string {
  return `${group.completedCount} completed · ${group.firstPassCount} first pass · ${group.reviewReturns} rework`;
}
